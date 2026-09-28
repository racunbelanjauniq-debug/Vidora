"""
account_manager.py - Manajemen Akun & Profil Google untuk VIDORA Worker
"""
import os
import sys
import time
from pathlib import Path

# Impor dari flow_engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flow_engine import GoogleAccountSession, get_profile_dir, sanitize_email, get_chrome_exe

def pair_google_account(email, headful=True):
    """
    Buka jendela Chrome secara tampak (headful) agar user/admin bisa login ke Google.
    Setelah user selesai login dan menutup jendela, profil tersimpan permanen.
    """
    email = email.strip()
    if not email:
        raise ValueError("Email tidak boleh kosong.")

    print(f"\n=======================================================")
    print(f" [VIDORA] Membuka browser untuk login Google: {email}")
    print(f" Silakan login ke akun Google Anda di jendela browser yang muncul.")
    print(f" Setelah selesai login dan masuk ke Google Flow, tutup jendela.")
    print(f"=======================================================\n")

    session = GoogleAccountSession(email=email, hidden=False)
    # Buka langsung ke Google Flow atau halaman login
    proc = session.launch_browser(url="https://labs.google/fx/tools/flow", headful=True)
    
    # Tunggu sampai proses browser ditutup oleh user
    try:
        proc.wait()
        print(f"\n[VIDORA] Browser untuk {email} telah ditutup.")
    except KeyboardInterrupt:
        session.close_browser()
        print(f"\n[VIDORA] Proses login dihentikan.")

    # Cek apakah sesi berhasil disimpan
    profile_dir = get_profile_dir(email)
    print(f"[VIDORA] Folder profil tersimpan di: {profile_dir}")
    return True

def check_account_credit(email, model="Omni Flash"):
    """
    Memeriksa ketersediaan kuota/kredit generate Google Flow untuk akun tertentu.
    """
    session = GoogleAccountSession(email=email, hidden=True)
    res = session.check_generate_ready(model=model) or {}
    state = res.get("state", "unknown")
    label = res.get("label", "")
    reason = res.get("reason", "")
    return {
        "email": email,
        "state": state,
        "label": label,
        "reason": reason
    }

def delete_account_profile(email):
    """
    Hapus folder profil Google dari disk lokal worker.
    """
    profile_dir = get_profile_dir(email)
    if profile_dir.exists():
        import shutil
        shutil.rmtree(profile_dir, ignore_errors=True)
        print(f"[VIDORA] Profil {email} berhasil dihapus.")
        return True
    return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "login" and len(sys.argv) > 2:
            pair_google_account(sys.argv[2])
        elif cmd == "check" and len(sys.argv) > 2:
            res = check_account_credit(sys.argv[2])
            print(f"Hasil Cek: {res}")
        elif cmd == "delete" and len(sys.argv) > 2:
            delete_account_profile(sys.argv[2])
        else:
            print("Penggunaan:")
            print("  python account_manager.py login <email>")
            print("  python account_manager.py check <email>")
            print("  python account_manager.py delete <email>")
    else:
        print("Penggunaan: python account_manager.py [login|check|delete] <email>")
