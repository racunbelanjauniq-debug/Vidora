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
            notifyOnOrder: true,
            notifyOnApproval: true,
            notifyOnRender: true,
            templateOrder: "Halo {nama}, terima kasih! Pesanan {paket} ({invoice}) sebesar Rp {total} telah kami terima. Silakan selesaikan pembayaran untuk aktivasi akun.",
            templateApproval: "Selamat {nama}! Pembayaran Anda untuk {paket} ({invoice}) telah diverifikasi. Akun 5 Profil Google Anda kini telah AKTIF. Silakan buka studio di https://vidora.biz.id/app.html",
            templateRender: "Halo {nama}, render video AI produk Anda telah SELESAI! Unduh video Anda di galeri: {link_video}"
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

    // Trigger 1: Order Masuk (Checkout)
    async notifyOrderPlaced(order) {
        if (!this.config.notifyOnOrder) return;
        const msg = this.config.templateOrder
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass")
            .replace(/{total}/g, (order.price || 75000).toLocaleString("id-ID"))
            .replace(/{metode}/g, order.payment_method || "QRIS");

        // Kirim ke pembeli
        if (order.customer_phone) {
            await this.sendWhatsApp(order.customer_phone, msg);
        }

        // Kirim notifikasi ke Admin
        if (this.config.adminPhone) {
            const adminMsg = `🔔 *ORDER MASUK (VIDORA)*\nInvoice: ${order.id}\nCustomer: ${order.customer_name} (${order.customer_phone})\nPaket: ${order.plan_name}\nTotal: Rp ${(order.price || 75000).toLocaleString("id-ID")}\nMetode: ${order.payment_method}\n\nSilakan cek panel Admin di https://vidora.biz.id/admin`;
            await this.sendWhatsApp(this.config.adminPhone, adminMsg);
        }
    }

    // Trigger 2: Order Disetujui / Lunas
    async notifyOrderApproved(order) {
        if (!this.config.notifyOnApproval) return;
        const msg = this.config.templateApproval
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass");

        if (order.customer_phone) {
            return await this.sendWhatsApp(order.customer_phone, msg);
        }
    }

    // Trigger 3: Render Video Selesai
    async notifyRenderCompleted(job, videoUrl, userPhone, userName) {
        if (!this.config.notifyOnRender || !userPhone) return;
        const msg = this.config.templateRender
            .replace(/{nama}/g, userName || "Kreator")
            .replace(/{link_video}/g, videoUrl || "");

        return await this.sendWhatsApp(userPhone, msg);
    }
}

// Inisialisasi Singleton
window.xsender = new XsenderService();
