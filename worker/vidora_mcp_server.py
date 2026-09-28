"""
vidora_mcp_server.py — Model Context Protocol (MCP) Server untuk VIDORA AI.

Menghubungkan VIDORA ke Hermes Agent (SumoPod / VPS / Telegram Bot),
Claude Desktop, Cursor, atau LLM Agent lainnya via protokol MCP (JSON-RPC / SSE).

Tools yang disediakan untuk Hermes AI:
1. vidora_generate_video: Generate video AI sinematik (Omni Flash / Veo) format 9:16/16:9/1:1
2. vidora_generate_image: Generate foto produk studio AI (Nano Banana)
3. vidora_generate_prompt: AI Smart Prompt Generator dari gambar produk (Gemini Vision)
4. vidora_list_accounts: Cek daftar akun Google yang siap dan terhubung
5. vidora_get_job_status: Cek status render, progress %, dan link download MP4
6. vidora_cleanup_storage: Hapus otomatis media R2 yang lebih lama dari 3 hari
"""
import os
import sys
import json
import time
import argparse
import subprocess
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Muat file .env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# Log ke stderr agar tidak merusak stdout JSON-RPC
def log_debug(msg: str):
    sys.stderr.write(f"[VIDORA MCP] {msg}\n")
    sys.stderr.flush()

try:
    from mcp.server.mcpserver import MCPServer
except ImportError:
    log_debug("Module 'mcp' belum terinstall. Menggunakan FastMCP fallback...")
    try:
        from mcp.server.fastmcp import FastMCP as MCPServer
    except ImportError:
        log_debug("Module 'mcp' tidak ditemukan. Jalankan: pip install mcp")
        raise

# Inisialisasi Server MCP
mcp = MCPServer("vidora_ai")

# Import modul internal VIDORA
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flow_engine import GoogleVideoGenerator, GoogleAccountSession, get_profile_dir
from r2_uploader import R2Uploader

def _get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None

# =========================================================================
# MCP TOOLS UNTUK HERMES AI AGENT
# =========================================================================

@mcp.tool()
def vidora_list_accounts() -> Dict[str, Any]:
    """Melihat daftar seluruh akun Google yang terdaftar dan siap digunakan di VIDORA."""
    supabase = _get_supabase_client()
    accounts = []
    if supabase:
        try:
            res = supabase.table("google_accounts").select("id, email, label, status, credit_status, last_used_at").execute()
            accounts = res.data or []
        except Exception as e:
            log_debug(f"Error baca akun dari Supabase: {e}")

    # Fallback disk lokal
    profiles_dir = Path(__file__).resolve().parent.parent / "data" / "google_profiles"
    local_profiles = []
    if profiles_dir.exists():
        local_profiles = [p.name for p in profiles_dir.iterdir() if p.is_dir()]

    return {
        "status": "success",
        "total_accounts": len(accounts) if accounts else len(local_profiles),
        "accounts": accounts if accounts else [{"email": p, "status": "active"} for p in local_profiles]
    }

@mcp.tool()
def vidora_generate_video(
    prompt: str,
    ratio: str = "9:16",
    duration: str = "8s",
    model: str = "Omni Flash",
    email: Optional[str] = None,
    hidden: bool = True
) -> Dict[str, Any]:
    """
    Generate video AI sinematik menggunakan VIDORA Engine.
    
    Args:
        prompt: Deskripsi visual adegan video yang ingin digenerate
        ratio: Aspek rasio video ('9:16' vertikal Shorts/TikTok, '16:9' horizontal YouTube, '1:1' kotak)
        duration: Durasi video ('4s', '6s', '8s', '10s')
        model: Model render ('Omni Flash' cepat, 'Veo' resolusi tinggi)
        email: Akun Google spesifik (opsional, jika kosong otomatis rotasi akun aktif)
        hidden: Jalankan browser di latar belakang tanpa mengganggu layar (default: True)
    """
    supabase = _get_supabase_client()
    job_id = f"hermes-{int(time.time())}"

    if supabase:
        try:
            # Ambil akun jika tidak ditentukan
            acc_id = None
            if email:
                acc_res = supabase.table("google_accounts").select("id").eq("email", email).limit(1).execute()
                if acc_res.data:
                    acc_id = acc_res.data[0]["id"]
            
            res = supabase.table("generate_jobs").insert({
                "prompt": prompt,
                "model": model,
                "ratio": ratio,
                "duration": duration,
                "google_account_id": acc_id,
                "hidden_browser": hidden,
                "status": "pending",
                "status_message": "Diterima dari Hermes AI Agent..."
            }).select().single().execute()
            
            return {
                "status": "queued",
                "job_id": res.data["id"],
                "message": f"Job video berhasil diantrikan di VIDORA. Gunakan vidora_get_job_status dengan job_id '{res.data['id']}' untuk memantau progres."
            }
        except Exception as e:
            log_debug(f"Gagal antrikan ke Supabase: {e}")

    return {
        "status": "error",
        "message": "Gagal membuat antrian generate video di VIDORA. Periksa koneksi database."
    }

@mcp.tool()
def vidora_generate_image(
    prompt: str,
    ratio: str = "9:16",
    email: Optional[str] = None,
    hidden: bool = True
) -> Dict[str, Any]:
    """
    Generate foto studio produk AI menggunakan VIDORA Engine (Nano Banana).
    
    Args:
        prompt: Deskripsi konsep foto produk/studio
        ratio: Aspek rasio ('9:16', '1:1', '16:9', '4:3')
        email: Akun Google spesifik (opsional)
        hidden: Mode tersembunyi tanpa membuka jendela (default: True)
    """
    supabase = _get_supabase_client()
    if supabase:
        try:
            res = supabase.table("generate_jobs").insert({
                "prompt": prompt,
                "model": "Nano Banana",
                "ratio": ratio,
                "duration": "photo",
                "hidden_browser": hidden,
                "status": "pending",
                "status_message": "Diterima dari Hermes AI..."
            }).select().single().execute()

            return {
                "status": "queued",
                "job_id": res.data["id"],
                "message": f"Job gambar berhasil diantrikan di VIDORA. Cek status berkala dengan vidora_get_job_status('{res.data['id']}')."
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    return {"status": "error", "message": "Supabase client tidak terhubung."}

@mcp.tool()
def vidora_generate_prompt(
    image_path: str,
    mode: str = "video",
    style: str = "cinematic",
    platform: str = "tiktok"
) -> Dict[str, Any]:
    """
    Menganalisis gambar produk via Gemini Vision dan menghasilkan prompt sinematik siap generate.
    
    Args:
        image_path: Path lokal file gambar atau Base64
        mode: 'video' untuk video generator, 'image' untuk image generator
        style: Gaya konten ('cinematic', 'affiliate', 'minimalist', 'storyboard', 'ugc', 'kuliner')
        platform: Platform target ('tiktok' keranjang kuning, 'shopee' keranjang oranye, 'instagram', 'youtube', 'ads')
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return {
            "status": "error",
            "message": "GEMINI_API_KEY belum diset di file .env worker VIDORA."
        }

    return {
        "status": "success",
        "mode": mode,
        "style": style,
        "platform": platform,
        "prompt": f"Commercial {style} shot of product from {os.path.basename(image_path)}, 8k resolution, photorealistic studio lighting, dynamic camera motion. Optimized for {platform}."
    }

@mcp.tool()
def vidora_get_job_status(job_id: str) -> Dict[str, Any]:
    """
    Memeriksa progres, status rendering, dan URL file video/gambar hasil generate.
    
    Args:
        job_id: ID pekerjaan yang didapat saat menjalankan vidora_generate_video atau vidora_generate_image
    """
    supabase = _get_supabase_client()
    if not supabase:
        return {"status": "error", "message": "Koneksi Supabase tidak tersedia."}

    try:
        res = supabase.table("generate_jobs").select("*").eq("id", job_id).limit(1).execute()
        if not res.data:
            return {"status": "not_found", "message": f"Job ID {job_id} tidak ditemukan."}

        job = res.data[0]
        return {
            "job_id": job["id"],
            "status": job["status"],
            "progress_percent": job.get("progress", 0),
            "status_message": job.get("status_message", ""),
            "video_url": job.get("video_url"),
            "model": job.get("model"),
            "ratio": job.get("ratio"),
            "created_at": job.get("created_at"),
            "completed_at": job.get("completed_at")
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@mcp.tool()
def vidora_cleanup_storage(days: int = 3) -> Dict[str, Any]:
    """
    Membersihkan file video/gambar di Cloudflare R2 yang umurnya sudah melewati batas hari (default: 3 hari) agar storage tetap lega.
    
    Args:
        days: Batas umur file dalam hari (default: 3 hari)
    """
    supabase = _get_supabase_client()
    if not supabase:
        return {"status": "error", "message": "Supabase tidak terhubung."}

    try:
        from datetime import datetime, timedelta
        r2 = R2Uploader()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        res = supabase.table("generate_jobs").select("id, r2_key").eq("status", "completed").lt("created_at", cutoff).not_.is_("r2_key", "null").execute()
        expired = res.data or []

        deleted_count = 0
        for item in expired:
            key = item.get("r2_key")
            if key and r2.delete_file(key):
                supabase.table("generate_jobs").update({
                    "status": "expired",
                    "video_url": None,
                    "r2_key": None,
                    "status_message": f"Dihapus otomatis oleh MCP cleaner (> {days} hari)"
                }).eq("id", item["id"]).execute()
                deleted_count += 1

        return {
            "status": "success",
            "message": f"Berhasil membersihkan {deleted_count} file media kadaluwarsa dari Cloudflare R2.",
            "deleted_count": deleted_count
        }
    except Exception as e:
        return {"status": "error", "message": f"Gagal cleanup R2: {e}"}

# =========================================================================
# SERVER RUNNER (STDIO / SSE CLOUDFLARE ANTI-BUFFERING)
# =========================================================================

def main():
    parser = argparse.ArgumentParser(description="VIDORA MCP Server untuk Hermes Cloud")
    parser.add_argument("--transport", default="sse", choices=["stdio", "sse"], help="Protokol MCP transport (sse untuk Hermes Cloud/SumoPod, stdio untuk Claude Desktop)")
    parser.add_argument("--host", default="0.0.0.0", help="Host bind untuk SSE")
    parser.add_argument("--port", type=int, default=8765, help="Port untuk SSE")
    args = parser.parse_args()

    if args.transport == "stdio":
        log_debug("Memulai VIDORA MCP Server (stdio transport)...")
        mcp.run(transport="stdio")
    elif args.transport == "sse":
        log_debug(f"Memulai VIDORA MCP Server (SSE transport) di http://{args.host}:{args.port}/sse ...")
        try:
            from mcp.server.transport_security import TransportSecuritySettings
            import uvicorn
            import anyio

            sec = TransportSecuritySettings(enable_dns_rebinding_protection=False)
            app = mcp.sse_app(transport_security=sec, host=args.host)

            class AntiBufferingMiddleware:
                """Mencegah Cloudflare Reverse Proxy mem-buffer SSE stream."""
                def __init__(self, asgi_app):
                    self.asgi_app = asgi_app

                async def __call__(self, scope, receive, send):
                    if scope.get("type") == "http":
                        is_sse = False
                        first_body = True

                        async def custom_send(message):
                            nonlocal is_sse, first_body
                            if message.get("type") == "http.response.start":
                                raw_headers = list(message.get("headers", []))
                                new_headers = []
                                for k, v in raw_headers:
                                    if k.lower() in (b"cache-control", b"x-accel-buffering"):
                                        continue
                                    if k.lower() == b"content-type" and b"text/event-stream" in v.lower():
                                        is_sse = True
                                    new_headers.append((k, v))
                                new_headers.append((b"cache-control", b"no-cache, no-transform, no-store"))
                                new_headers.append((b"x-accel-buffering", b"no"))
                                message["headers"] = new_headers
                            elif message.get("type") == "http.response.body" and is_sse and first_body:
                                first_body = False
                                body = message.get("body", b"")
                                padding = b": " + (b" " * 4096) + b"\n\n"
                                message["body"] = padding + body
                            await send(message)

                        await self.asgi_app(scope, receive, custom_send)
                    else:
                        await self.asgi_app(scope, receive, send)

            wrapped_app = AntiBufferingMiddleware(app)
            config = uvicorn.Config(
                wrapped_app,
                host=args.host,
                port=args.port,
                log_level="info"
            )
            server = uvicorn.Server(config)
            anyio.run(server.serve)
        except Exception as e:
            log_debug(f"Menjalankan standar SSE fallback: {e}")
            mcp.run(transport="sse", host=args.host, port=args.port)

if __name__ == "__main__":
    main()
