"""
vidora_worker.py - Background Worker Engine untuk VIDORA SaaS
Menghubungkan Antrian Task di Supabase dengan Engine Otomasi Google Flow & Cloudflare R2
"""
import os
import sys
import time
import socket
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Muat file .env dari folder worker atau root proyek
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flow_engine import GoogleVideoGenerator, GoogleAccountSession, sanitize_email
from r2_uploader import R2Uploader

WORKER_ID = f"worker-{socket.gethostname()}-{os.getpid()}"

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception as e:
        print(f"[Worker] Error inisialisasi Supabase client: {e}")
        return None

def process_job(supabase, r2, job):
    job_id = job["id"]
    user_id = job["user_id"]
    prompt = job.get("prompt", "")
    model = job.get("model", "Omni Flash")
    ratio = job.get("ratio", "9:16")
    duration = job.get("duration", "8s")
    count = job.get("count", 1)
    hidden = job.get("hidden_browser", True)

    print(f"\n=======================================================")
    print(f" [VIDORA] Memproses Job ID: {job_id}")
    print(f" Prompt: {prompt[:80]}...")
    print(f" Model: {model} | Ratio: {ratio} | Hidden: {hidden}")
    print(f"=======================================================")

    # 1. Cari Akun Google yang akan dipakai
    account_email = None
    if job.get("google_account_id"):
        acc_res = supabase.table("google_accounts").select("email").eq("id", job["google_account_id"]).execute()
        if acc_res.data:
            account_email = acc_res.data[0]["email"]

    if not account_email:
        # Cari akun aktif milik user
        acc_res = supabase.table("google_accounts").select("id, email").eq("user_id", user_id).eq("status", "active").limit(1).execute()
        if acc_res.data:
            account_email = acc_res.data[0]["email"]
            # Ikat akun ke job
            supabase.table("generate_jobs").update({"google_account_id": acc_res.data[0]["id"]}).eq("id", job_id).execute()

    if not account_email:
        err_msg = "Tidak ada akun Google yang aktif/terhubung untuk user ini."
        print(f"[Worker] Gagal: {err_msg}")
        supabase.table("generate_jobs").update({
            "status": "failed",
            "status_message": err_msg,
            "error_message": err_msg
        }).eq("id", job_id).execute()
        return False

    # 2. Update status processing
    supabase.table("generate_jobs").update({
        "status": "processing",
        "progress": 15,
        "status_message": f"Membuka Google Flow menggunakan akun {account_email}...",
        "worker_id": WORKER_ID,
        "started_at": datetime.utcnow().isoformat()
    }).eq("id", job_id).execute()

    # 3. Callback progress
    def update_progress(msg, pct=None):
        print(f"[{account_email}] {msg}")
        payload = {"status_message": str(msg)[:200]}
        if pct is not None:
            payload["progress"] = pct
        try:
            supabase.table("generate_jobs").update(payload).eq("id", job_id).execute()
        except Exception:
            pass

    # 4. Jalankan Flow Generator
    output_dir = Path(__file__).resolve().parent / "downloads" / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        generator = GoogleVideoGenerator(
            email=account_email,
            image_path=None,
            prompt=prompt,
            ratio=ratio,
            count=count,
            duration=duration,
            model=model,
            log_cb=lambda m, l="info": update_progress(m),
            hidden=hidden,
            output_name=f"vidora_{job_id[:8]}"
        )

        update_progress("Mengirim prompt ke Google Flow...", 35)
        success = generator.run_generate(status_cb=lambda m: update_progress(m))

        if not success or not generator.last_output_paths:
            raise RuntimeError("Google Flow tidak menghasilkan video atau proses dihentikan.")

        generated_file = generator.last_output_paths[0]
        update_progress("Video selesai dirender. Mengunggah ke Cloudflare R2...", 85)

        # 5. Unggah ke Cloudflare R2
        r2_dest_key = f"videos/{user_id}/{job_id}.mp4"
        upload_res = r2.upload_file(generated_file, destination_key=r2_dest_key)
        video_url = upload_res["url"]

        # 6. Selesaikan Job di Supabase
        update_progress("Video berhasil diunggah dan siap ditonton!", 100)
        supabase.table("generate_jobs").update({
            "status": "completed",
            "progress": 100,
            "status_message": "Selesai",
            "video_url": video_url,
            "r2_key": r2_dest_key,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

        # Update last_used_at akun google
        supabase.table("google_accounts").update({
            "last_used_at": datetime.utcnow().isoformat()
        }).eq("email", account_email).execute()

        print(f"[Worker] Sukses menyelesaikan Job {job_id}! URL: {video_url}")
        return True

    except Exception as exc:
        err = str(exc)
        print(f"[Worker] Error pada Job {job_id}: {err}")
        supabase.table("generate_jobs").update({
            "status": "failed",
            "status_message": f"Error: {err[:150]}",
            "error_message": err
        }).eq("id", job_id).execute()
        return False

def run_loop():
    print(f"============================================================")
    print(f"  VIDORA Background Worker Engine [{WORKER_ID}]")
    print(f"  Menunggu antrian video generate dari Web SaaS...")
    print(f"============================================================")

    supabase = get_supabase_client()
    if not supabase:
        print("[Worker] FATAL: Supabase belum dikonfigurasi. Periksa file .env Anda.")
        sys.exit(1)

    try:
        r2 = R2Uploader()
    except Exception as e:
        print(f"[Worker] FATAL: Cloudflare R2 belum dikonfigurasi: {e}")
        sys.exit(1)

    while True:
        try:
            # Ambil 1 job pending tertua
            res = supabase.table("generate_jobs").select("*").eq("status", "pending").order("created_at", desc=False).limit(1).execute()
            if res.data and len(res.data) > 0:
                job = res.data[0]
                process_job(supabase, r2, job)
            else:
                time.sleep(3)
        except KeyboardInterrupt:
            print("\n[Worker] Worker dihentikan oleh pengguna.")
            break
        except Exception as e:
            print(f"[Worker] Loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    if "--test" in sys.argv:
        print("[Worker] Mode Test Langsung (Bypass Supabase Queue)")
        email = sys.argv[2] if len(sys.argv) > 2 else "test@gmail.com"
        prompt = sys.argv[3] if len(sys.argv) > 3 else "Cinematic cyberpunk city flying car 4k 60fps"
        gen = GoogleVideoGenerator(
            email=email,
            image_path=None,
            prompt=prompt,
            ratio="9:16",
            model="Omni Flash",
            hidden=False
        )
        ok = gen.run_generate(status_cb=lambda m: print(f"[Test] {m}"))
        print(f"Hasil Test: {ok} | File: {gen.last_output_paths}")
    else:
        run_loop()
