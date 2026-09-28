"""
run_mcp_tunnel.py — Menjalankan VIDORA MCP Server + Cloudflare Tunnel Publik untuk Hermes Cloud.
Memberikan URL publik HTTPS yang langsung siap ditempel ke SumoPod / VPS Hermes Agent.
"""
import os
import sys
import time
import subprocess
import re
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARED = os.path.join(BASE_DIR, 'cloudflared.exe')

def ensure_cloudflared():
    """Download cloudflared.exe otomatis jika belum ada."""
    if os.path.isfile(CLOUDFLARED):
        return CLOUDFLARED

    # Cek apakah ada di sistem PATH
    try:
        res = subprocess.run(["where", "cloudflared"], capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip().split("\n")[0].strip()
    except Exception:
        pass

    print("[Tunnel] Mendownload cloudflared.exe (gratis, tanpa akun Cloudflare)...")
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try:
        urllib.request.urlretrieve(url, CLOUDFLARED)
        print("[Tunnel] Download cloudflared.exe selesai!")
        return CLOUDFLARED
    except Exception as e:
        print(f"[Tunnel] Gagal download cloudflared otomatis: {e}")
        return None

def main():
    print("=" * 65)
    print("   VIDORA AI — MCP SERVER & CLOUDFLARE TUNNEL FOR HERMES")
    print("=" * 65)
    print("\n[1/2] Menjalankan VIDORA MCP Server di port 8765...")

    server_cmd = [sys.executable, os.path.join(BASE_DIR, 'vidora_mcp_server.py'), '--transport', 'sse', '--port', '8765']
    server_proc = subprocess.Popen(server_cmd, cwd=BASE_DIR)

    time.sleep(2)
    if server_proc.poll() is not None:
        print("[ERROR] Gagal menjalankan MCP server! Cek apakah dependensi 'mcp' dan 'uvicorn' sudah terinstall.")
        return

    cloudflared_bin = ensure_cloudflared()
    if not cloudflared_bin:
        print("[ERROR] Tidak dapat menemukan cloudflared.exe. Pastikan koneksi internet aktif.")
        server_proc.terminate()
        return

    print("[2/2] Membuka Cloudflare Public Tunnel...")
    tunnel_cmd = [cloudflared_bin, 'tunnel', '--url', 'http://localhost:8765']
    tunnel_proc = subprocess.Popen(
        tunnel_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        cwd=BASE_DIR
    )

    public_url = None
    start = time.time()

    while time.time() - start < 35:
        line = tunnel_proc.stderr.readline()
        if not line and tunnel_proc.poll() is not None:
            break
        if 'trycloudflare.com' in line:
            m = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            if m:
                public_url = m.group(0)
                break

    if not public_url:
        print("\n[ERROR] Gagal mendapatkan URL Tunnel. Coba lagi dalam beberapa detik.")
        tunnel_proc.terminate()
        server_proc.terminate()
        return

    sse_url = f"{public_url}/sse"
    print("\n" + "=" * 65)
    print("  🚀 VIDORA MCP SERVER BERHASIL ONLINE DI CLOUD!")
    print("=" * 65)
    print(f"\n  URL SSE Publik : {sse_url}")
    print("\n  Perintah Cepat untuk Hermes Cloud (SumoPod Web Console):")
    print(f"  👉 hermes mcp add vidora --url \"{sse_url}\"")
    print("\n  (Saat muncul pertanyaan 'authentication? [Y/n]', ketik n lalu Enter)")
    print("=" * 65)
    print("  Tekan Ctrl+C di terminal ini untuk mematikan server.")
    print("=" * 65 + "\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Tunnel] Menghentikan VIDORA MCP Server & Tunnel...")
        tunnel_proc.terminate()
        server_proc.terminate()
        print("[Tunnel] Server berhasil dimatikan.")

if __name__ == "__main__":
    main()
