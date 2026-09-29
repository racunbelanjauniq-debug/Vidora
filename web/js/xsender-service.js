// =========================================================================
// VIDORA — xsender.id WhatsApp Gateway Integration Service
// Otomasi Notifikasi WhatsApp — Standar GAMA PRO (Tanpa Endpoint Manual)
// =========================================================================

class XsenderService {
    constructor() {
        this.config = {
            apiKey: "",
            sender: "",
            adminPhone: "081234567890",
            notifyOnLogin: true,
            notifyOnOrder: true,
            notifyOnApproval: true,
            notifyOnRender: true,
            templateLogin: `Halo *{nama}* 👋,

Selamat datang di *VIDORA Studio*! 🚀
Akun kreator Anda telah aktif dan siap digunakan:

📧 Email: *{email}*
📱 WhatsApp: *{phone}*
🌐 Akses Studio: https://vidora.biz.id/app

Mulai kreasi video produk AI tanpa batas dengan multi-sudut, audio voiceover, dan render cloud secepat kilat!

Salam hangat,
*Tim VIDORA Studio*`,

            templateOrder: `Halo *{nama}* 👋,

Terima kasih telah memesan *VIDORA Creator Pass*! 🎬

📋 *Detail Pesanan Anda (Tahap 1):*
• No Invoice: \`{invoice}\`
• Paket: *{paket}*
• Total Tagihan: *Rp {total}*

💳 *Selesaikan Pembayaran via QRIS Pakasir:*
👉 {payment_url}

(Pembayaran diverifikasi instan otomatis via QRIS. Setelah scan pembayaran, kuota 5 Profil Akun Google Anda langsung aktif otomatis).

Salam hangat,
*Tim VIDORA Studio* 🚀`,

            templateFollowUp2: `Halo *{nama}* 😊,

Kami melihat pesanan *VIDORA Creator Pass* Anda (\`{invoice}\`) sebesar *Rp {total}* masih menunggu pembayaran via QRIS.

✨ *Keuntungan Creator Pass Aktif Anda:*
• 5 Akun Google Terisolasi (Bebas Limit & Anti-Banned)
• Video Mixer & Multi-angle Concatenation
• Cloud Render Resolusi Tinggi & Tanpa Watermark

Selesaikan pembayaran Anda sekarang melalui link QRIS resmi berikut:
👉 {payment_url}

Jika ada kendala saat scan QRIS, silakan balas pesan ini ya Kak. Terima kasih! 🙏`,

            templateFollowUp3: `Halo *{nama}* ⚠️,

Ini adalah pengingat terakhir untuk tagihan pesanan *VIDORA Creator Pass* Anda:
No Invoice: \`{invoice}\` (Total: *Rp {total}*)

Promo harga spesial Rp 75.000 / bulan untuk 5 Profil Google akan segera ditutup. Segera amankan kuota akun Anda sekarang:
👉 {payment_url}

Butuh bantuan pembayaran atau transfer manual? Admin kami siap membantu, cukup balas pesan ini sekarang ya Kak.

Salam sukses,
*Tim VIDORA Studio* 🚀`,

            templateApproval: `🎉 *PEMBAYARAN DIVERIFIKASI & LISENSI AKTIF!*

Halo *{nama}* 👋,
Selamat! Pembayaran Anda untuk *{paket}* (\`{invoice}\`) telah berhasil kami terima.

✨ *Akun 5 Profil Google Anda kini telah AKTIF PENUH!*
🌐 Buka VIDORA Studio: https://vidora.biz.id/app

Fitur terbuka:
• Hingga 5 Profil Akun Google Terisolasi
• Semua Rasio Video (9:16, 16:9, 1:1, 4:5)
• Video Mixer & Multi-angle Concatenation
• Cloud Render & Direct Download

Terima kasih telah menjadi bagian dari Kreator VIDORA! 🎬`,

            templateRender: `Halo *{nama}*, render video AI produk Anda telah SELESAI! Unduh video Anda di galeri: {link_video}`
        };
        this.loadConfig();
    }

    loadConfig() {
        try {
            const raw = localStorage.getItem("vidora_xsender_config");
            if (raw) {
                const parsed = JSON.parse(raw);
                this.config = {
                    ...this.config,
                    ...parsed,
                    apiKey: parsed.apiKey || parsed.apiToken || "",
                    sender: parsed.sender || parsed.deviceId || ""
                };
            }
        } catch (e) {
            console.warn("[Xsender] Gagal membaca config lokal:", e);
        }
    }

    async saveConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            apiKey: newConfig.apiKey || newConfig.apiToken || this.config.apiKey,
            sender: newConfig.sender || newConfig.deviceId || this.config.sender
        };
        localStorage.setItem("vidora_xsender_config", JSON.stringify(this.config));

        // Save to Supabase system_settings if live client is available
        if (window.vidoraData && window.vidoraData.isLive) {
            try {
                await window.vidoraData.client
                    .from("system_settings")
                    .upsert({
                        key: "xsender_config",
                        value: this.config,
                        updated_at: new Date().toISOString()
                    });
            } catch (err) {
                console.warn("[Xsender] Supabase sync warning:", err);
            }
        }
        return true;
    }

    formatPhone(phone) {
        if (!phone) return "";
        let cleaned = String(phone).replace(/[^0-9]/g, "");
        if (cleaned.startsWith("0")) {
            cleaned = "62" + cleaned.slice(1);
        } else if (cleaned.startsWith("+62")) {
            cleaned = cleaned.slice(1);
        } else if (!cleaned.startsWith("62")) {
            cleaned = "62" + cleaned;
        }
        return cleaned;
    }

    async sendWhatsApp(phone, message) {
        const targetPhone = this.formatPhone(phone);
        if (!targetPhone) {
            return { success: false, message: "Nomor WhatsApp tujuan tidak valid." };
        }

        if (!this.config.apiKey) {
            console.log(`[Xsender Mock / Belum Ada API Key] Kirim ke ${targetPhone}:\n${message}`);
            return {
                success: true,
                simulated: true,
                message: `[Simulasi] API Key belum diisi di dashboard admin. Pesan tercatat untuk ${targetPhone}.`
            };
        }

        if (!this.config.sender) {
            return {
                success: false,
                message: "Nomor Sender WhatsApp belum diisi. Masukkan nomor WhatsApp yang di-scan di xsender.id."
            };
        }

        try {
            // Coba lewat proxy serverless /api/send-wa terlebih dahulu untuk menghindari CORS
            const proxyRes = await fetch("/api/send-wa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: this.config.apiKey,
                    sender: this.formatPhone(this.config.sender),
                    number: targetPhone,
                    message: message,
                    footer: "Sent via VIDORA Studio"
                })
            }).catch(() => null);

            if (proxyRes && proxyRes.ok) {
                const proxyData = await proxyRes.json();
                return { success: true, data: proxyData, message: proxyData.message || "Pesan WhatsApp berhasil terkirim!" };
            } else if (proxyRes && !proxyRes.ok) {
                const errData = await proxyRes.json().catch(() => ({}));
                return { success: false, message: errData.message || `Gagal kirim pesan (HTTP ${proxyRes.status})` };
            }

            // Fallback direct call ke https://xsender.id/send-message jika serverless route belum aktif
            const payload = {
                api_key: this.config.apiKey,
                sender: this.formatPhone(this.config.sender),
                number: targetPhone,
                message: message,
                footer: "Sent via VIDORA Studio"
            };

            const directRes = await fetch("https://xsender.id/send-message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await directRes.json().catch(() => null);
            if (data && data.status === true) {
                return { success: true, data: data, message: data.msg || "Pesan WhatsApp berhasil terkirim!" };
            } else {
                return { success: false, message: data?.msg || "Gagal mengirim pesan via XSender." };
            }

        } catch (err) {
            console.error("[Xsender Error]", err);
            return { success: false, message: "Gagal memanggil gateway xsender.id: " + err.message };
        }
    }

    // Helper untuk kompatibilitas sendMessage
    async sendMessage(phone, message) {
        const res = await this.sendWhatsApp(phone, message);
        return {
            success: res.success,
            error: res.success ? null : res.message,
            message: res.message,
            data: res.data
        };
    }

    // Helper URL pembayaran Pakasir
    getPakasirPaymentUrl(order) {
        if (order.payment_url) return order.payment_url;
        const slug = localStorage.getItem("cfg_pakasir_slug") || "vidora";
        const redirectTarget = window.location.origin + "/app?order_id=" + (order.id || "") + "&status=success";
        return `https://app.pakasir.com/pay/${slug}/${order.price || 75000}?order_id=${order.id || ""}&redirect=${encodeURIComponent(redirectTarget)}&qris_only=1&method=qris`;
    }

    // Trigger 0: User Login / Registrasi Baru
    async notifyUserLogin(user) {
        if (!this.config.notifyOnLogin || !user || !user.phone) return;
        const msg = (this.config.templateLogin || "")
            .replace(/{nama}/g, user.name || "Kreator")
            .replace(/{email}/g, user.email || "")
            .replace(/{phone}/g, user.phone || "");
        return await this.sendWhatsApp(user.phone, msg);
    }

    // Trigger 1: Inisiasi Pesanan (Checkout Tahap 1 - Instan)
    async notifyOrderPlaced(order) {
        if (!this.config.notifyOnOrder) return;
        const payUrl = this.getPakasirPaymentUrl(order);
        const msg = (this.config.templateOrder || "")
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass")
            .replace(/{total}/g, (order.price || 75000).toLocaleString("id-ID"))
            .replace(/{metode}/g, order.payment_method || "QRIS Pakasir")
            .replace(/{payment_url}/g, payUrl);

        // Kirim ke pembeli
        if (order.customer_phone) {
            await this.sendWhatsApp(order.customer_phone, msg);
        }

        // Kirim notifikasi ke Admin
        if (this.config.adminPhone) {
            const adminMsg = `🔔 *ORDER MASUK (VIDORA)*\nInvoice: ${order.id}\nCustomer: ${order.customer_name} (${order.customer_phone})\nPaket: ${order.plan_name}\nTotal: Rp ${(order.price || 75000).toLocaleString("id-ID")}\nMetode: ${order.payment_method}\nLink Bayar QRIS: ${payUrl}\n\nSilakan cek panel Admin di https://vidora.biz.id/admin`;
            await this.sendWhatsApp(this.config.adminPhone, adminMsg);
        }
    }

    // Trigger 2: Follow-up Tahap 2 (Pengingat Belum Bayar 15-30 Menit)
    async notifyFollowUpStage2(order) {
        if (!order || !order.customer_phone) return { success: false, message: "Nomor telepon pembeli tidak tersedia" };
        const payUrl = this.getPakasirPaymentUrl(order);
        const msg = (this.config.templateFollowUp2 || "")
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass")
            .replace(/{total}/g, (order.price || 75000).toLocaleString("id-ID"))
            .replace(/{payment_url}/g, payUrl);

        return await this.sendWhatsApp(order.customer_phone, msg);
    }

    // Trigger 3: Follow-up Tahap 3 (Urgent / Promo Terakhir)
    async notifyFollowUpStage3(order) {
        if (!order || !order.customer_phone) return { success: false, message: "Nomor telepon pembeli tidak tersedia" };
        const payUrl = this.getPakasirPaymentUrl(order);
        const msg = (this.config.templateFollowUp3 || "")
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass")
            .replace(/{total}/g, (order.price || 75000).toLocaleString("id-ID"))
            .replace(/{payment_url}/g, payUrl);

        return await this.sendWhatsApp(order.customer_phone, msg);
    }

    // Trigger 4: Order Disetujui / Lunas (Fulfillment)
    async notifyOrderApproved(order) {
        if (!this.config.notifyOnApproval) return;
        const msg = (this.config.templateApproval || "")
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass");

        if (order.customer_phone) {
            return await this.sendWhatsApp(order.customer_phone, msg);
        }
    }

    // Trigger 5: Render Video Selesai
    async notifyRenderCompleted(job, videoUrl, userPhone, userName) {
        if (!this.config.notifyOnRender || !userPhone) return;
        const msg = (this.config.templateRender || "")
            .replace(/{nama}/g, userName || "Kreator")
            .replace(/{link_video}/g, videoUrl || "");

        return await this.sendWhatsApp(userPhone, msg);
    }
}

// Inisialisasi Singleton
window.xsender = new XsenderService();
