# 🤖 Panduan Lengkap Koneksi Hermes AI & MCP Server di VIDORA

Panduan resmi menghubungkan **Hermes AI Agent** (di SumoPod Cloud, VPS, atau Telegram Bot) dengan **VIDORA Engine**.

---

## 🛠️ Daftar Tools MCP VIDORA untuk Hermes

| No | Nama Tool | Deskripsi Fungsi |
|---|---|---|
| 1 | `vidora_generate_video` | Generate video AI sinematik (Omni Flash / Veo) format 9:16 vertikal, 16:9, atau 1:1. |
| 2 | `vidora_generate_image` | Generate foto produk studio AI kualitas tinggi (Nano Banana). |
| 3 | `vidora_generate_prompt` | Analisa foto produk via Gemini Vision untuk menyusun prompt video/gambar. |
| 4 | `vidora_list_accounts` | Melihat daftar seluruh akun Google yang terhubung di VIDORA. |
| 5 | `vidora_get_job_status` | Memeriksa progres, status rendering, dan link download file MP4/gambar. |
| 6 | `vidora_cleanup_storage` | Membersihkan file R2 yang sudah lebih dari 3 hari agar storage tetap hemat. |

---

## 🚀 Cara Menghubungkan Hermes Cloud (SumoPod) ke VIDORA

### Langkah 1: Jalankan MCP Server & Cloudflare Tunnel di PC
Di laptop/PC Anda, cukup **klik ganda (double-click)** file:
📁 **`d:\VIDORA\start_mcp_hermes.bat`**
*(Atau via terminal: `cd worker && python run_mcp_tunnel.py`)*

Tunggu beberapa detik sampai muncul URL publik HTTPS:
```text
=================================================================
  🚀 VIDORA MCP SERVER BERHASIL ONLINE DI CLOUD!
=================================================================

  URL SSE Publik : https://xxxx-xxxx-xxxx.trycloudflare.com/sse

  Perintah Cepat untuk Hermes Cloud (SumoPod Web Console):
  👉 hermes mcp add vidora --url "https://xxxx-xxxx-xxxx.trycloudflare.com/sse"
=================================================================
```

---

### Langkah 2: Daftarkan di SumoPod Web Console
1. Buka dashboard **SumoPod** Anda.
2. Klik tombol **`>_ Web Console`** di pojok kanan atas dashboard.
3. Paste perintah yang muncul di terminal Anda tadi:
   ```bash
   hermes mcp add vidora --url "https://xxxx-xxxx-xxxx.trycloudflare.com/sse"
   ```
4. Ketika muncul pertanyaan:
   `Does this server require authentication? [Y/n]:`
   👉 Ketik huruf **`n`** lalu tekan **Enter**.
5. Cek apakah sudah aktif:
   ```bash
   hermes mcp list
   hermes mcp test vidora
   ```

---

### Langkah 3: Beri Perintah Lewat Telegram Bot Hermes
Restart SumoPod Anda, lalu buka bot **Telegram Hermes**. Anda sekarang bisa langsung menyuruh Hermes dari chat Telegram:
- *"Hermes, tolong buatkan video AI 8 detik botol skincare di atas meja marmer format 9:16 pakai VIDORA."*
- *"Hermes, cek akun Google yang aktif di VIDORA."*
- *"Hermes, cek status rendering job terakhir di VIDORA."*
