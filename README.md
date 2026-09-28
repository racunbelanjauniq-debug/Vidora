# 🎬 VIDORA — Cloud Multi-Account AI Video Generator

Platform SaaS otomasi video generator berbasis **Google Flow (Omni Flash & Veo)** dengan arsitektur **Multi-Account Vault**, antrean tugas terpusat, dan integrasi penyimpanan berkecepatan tinggi **Cloudflare R2**.

---

## 📁 Struktur Direktori Proyek

```text
d:\VIDORA\
├── web\                       # Mobile-First Web Application (Frontend)
│   ├── index.html             # High-Converting Landing Page (LP)
│   ├── app.html               # Mobile-First Studio SaaS (Dashboard)
│   ├── css\
│   │   ├── landing.css        # Desain Glassmorphism & Cyber-Luxury
│   │   └── app.css            # Mobile-first shell, bottom-nav, card widgets
│   └── js\
│       ├── config.js          # Konfigurasi Supabase & R2
│       ├── supabase-client.js # Bridge data Supabase (Realtime + Auth + Sandbox)
│       └── app.js             # Controller interaktif Studio, Akun, Queue & Galeri
│
├── worker\                    # Background Automation Engine (Adopsi GAMA Flow)
│   ├── vidora_worker.py       # Task runner antrean Supabase -> Google Flow -> R2
│   ├── flow_engine.py         # Engine inti otomasi browser (Off-screen / Invisible)
│   ├── account_manager.py     # CLI tool pairing & login akun Google
│   ├── r2_uploader.py         # Uploader MP4 langsung ke Cloudflare R2
│   └── requirements.txt       # Dependensi Python
│
├── supabase\
│   └── schema.sql             # SQL Schema (Profiles, Google Accounts, Generate Jobs, RLS)
│
├── .env.example               # Template environment credentials
└── README.md                  # Panduan setup & penggunaan
```

---

## 🚀 Panduan Setup Cepat

### 1. Database & Auth (Supabase)
1. Buka dashboard proyek Anda di [Supabase](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase/schema.sql`, salin seluruh isinya, dan klik **Run**.
4. Catat **Project URL** dan **anon public key** dari menu *Project Settings > API*.

### 2. Media Storage (Cloudflare R2)
1. Masuk ke dashboard [Cloudflare](https://dash.cloudflare.com/) ➔ **R2**.
2. Buat bucket baru bernama `vidora-videos`.
3. Buka **Manage R2 API Tokens** ➔ Buat token baru dengan izin *Admin Read & Write*.
4. Catat **Account ID**, **Access Key ID**, dan **Secret Access Key**.
5. Aktifkan **Public Access Domain** (atau gunakan r2.dev subdomain) agar video bisa di-stream langsung.

### 3. Konfigurasi Environment Worker
1. Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi nilai kredensial Supabase dan Cloudflare R2 yang telah Anda dapatkan di langkah 1 & 2.

### 4. Menjalankan Worker Engine
1. Masuk ke folder worker dan pasang dependensi:
   ```bash
   cd worker
   pip install -r requirements.txt
   ```
2. **Pairing Akun Google (Login Pertama Kali):**
   ```bash
   python account_manager.py login namaakun@gmail.com
   ```
   *Jendela Chrome akan terbuka. Silakan login ke akun Google Anda dan buka Google Flow. Setelah berhasil, tutup jendela. Sesi login akan tersimpan otomatis dan permanen.*
3. **Jalankan Background Worker:**
   ```bash
   python vidora_worker.py
   ```
   *Worker akan memantau antrean task dari Supabase, membuka browser tersembunyi (off-screen render), meng-generate video di Google Flow, dan mengunggah MP4 ke Cloudflare R2.*

---

## 📱 Mengakses Web App (Mobile & Desktop)

Anda dapat langsung membuka `web/index.html` (Landing Page) atau `web/app.html` (Studio App) di browser:
- **Tampilan Mobile:** Buka Developer Tools di browser (F12) ➔ Toggle Device Toolbar (Ctrl+Shift+M) untuk melihat pengalaman mobile native dengan *Bottom Navigation Bar*.
- **Hosting Online:** Anda bisa langsung mengunggah folder `web/` ke **Vercel** atau **Cloudflare Pages** (100% Gratis).

---

## 🛡️ Batasan Akun (Role System)
- **Member Regular:** Dibatasi maksimal **5 Akun Google** terhubung secara bersamaan.
- **Super Admin:** **Unlimited Akun Google** tanpa batasan slot dan akses prioritas antrean.
