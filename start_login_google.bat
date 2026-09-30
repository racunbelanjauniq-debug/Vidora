@echo off
title VIDORA - Login & Simpan Profil Akun Google
color 0b
echo =======================================================
echo    VIDORA SaaS - Login Akun Google (Multi-Profile)
echo =======================================================
echo.
echo Masukkan alamat email Google (Gmail) yang ingin Anda hubungkan:
set /p USER_EMAIL="Email Gmail: "

if "%USER_EMAIL%"=="" (
    echo [ERROR] Email tidak boleh kosong!
    pause
    exit /b
)

echo.
echo Pilih tujuan login:
echo [1] Google Flow (Nano Banana & Veo) - labs.google/fx/tools/flow
echo [2] Google Vids (AI Scene & Narration) - docs.google.com/videos
set /p TARGET_CHOICE="Pilihan (1/2, default: 1): "

set SERVICE_PARAM=flow
if "%TARGET_CHOICE%"=="2" set SERVICE_PARAM=vids

echo.
echo Membuka Chrome untuk %USER_EMAIL%...
echo Silakan login ke akun Google Anda. Setelah selesai dan masuk ke halaman studio, tutup jendela Chrome.
echo.

python worker\account_manager.py login "%USER_EMAIL%" %SERVICE_PARAM%

echo.
echo =======================================================
echo Selesai! Profil akun %USER_EMAIL% berhasil disimpan.
echo =======================================================
pause
