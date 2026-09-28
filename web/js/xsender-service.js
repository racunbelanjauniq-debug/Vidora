// =========================================================================
// VIDORA — xsender.id WhatsApp Gateway Integration Service
// Otomasi Notifikasi WhatsApp untuk Pemesanan, Aktivasi Akun, & Render Selesai
// =========================================================================

class XsenderService {
    constructor() {
        this.config = {
            apiUrl: "https://api.xsender.id/v1/messages",
            apiToken: "",
            deviceId: "",
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
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.warn("[Xsender] Gagal membaca config lokal:", e);
        }
    }

    async saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
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
        let cleaned = phone.replace(/[^0-9]/g, "");
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

        if (!this.config.apiToken) {
            console.log(`[Xsender Mock / Belum Ada Token] Kirim ke ${targetPhone}:\n${message}`);
            return {
                success: true,
                simulated: true,
                message: `[Simulasi Sukses] Token API belum diisi di dashboard admin. Pesan tercatat untuk ${targetPhone}.`
            };
        }

        try {
            // Standard xsender.id request body
            const payload = {
                to: targetPhone,
                recipient: targetPhone,
                phone: targetPhone,
                message: message,
                text: message,
                device_id: this.config.deviceId || undefined
            };

            const response = await fetch(this.config.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiToken}`,
                    "api-key": this.config.apiToken
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);

            if (response.ok) {
                return { success: true, data: data, message: "Pesan WhatsApp berhasil terkirim via xsender.id!" };
            } else {
                return {
                    success: false,
                    message: data?.message || data?.error || `HTTP ${response.status} dari gateway xsender.id`
                };
            }
        } catch (err) {
            console.error("[Xsender Error]", err);
            return { success: false, message: "Gagal memanggil API xsender.id: " + err.message };
        }
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
            const adminMsg = `🔔 *ORDER MASUK (VIDORA)*\nInvoice: ${order.id}\nCustomer: ${order.customer_name} (${order.customer_phone})\nPaket: ${order.plan_name}\nTotal: Rp ${(order.price || 75000).toLocaleString("id-ID")}\nMetode: ${order.payment_method}\n\nSilakan cek panel Admin di https://vidora.biz.id/app.html`;
            await this.sendWhatsApp(this.config.adminPhone, adminMsg);
        }
    }

    // Trigger 2: Order Disetujui / Akun Diaktifkan (Admin Approval)
    async notifyOrderApproved(order) {
        if (!this.config.notifyOnApproval) return;
        const msg = this.config.templateApproval
            .replace(/{nama}/g, order.customer_name || "Kreator")
            .replace(/{invoice}/g, order.id || "")
            .replace(/{paket}/g, order.plan_name || "VIDORA Creator Pass")
            .replace(/{total}/g, (order.price || 75000).toLocaleString("id-ID"));

        if (order.customer_phone) {
            return await this.sendWhatsApp(order.customer_phone, msg);
        }
    }

    // Trigger 3: Render Selesai
    async notifyRenderDone(customerPhone, customerName, promptText, videoUrl) {
        if (!this.config.notifyOnRender || !customerPhone) return;
        const shortPrompt = promptText.length > 50 ? promptText.slice(0, 47) + "..." : promptText;
        const msg = this.config.templateRender
            .replace(/{nama}/g, customerName || "Kreator")
            .replace(/{judul}/g, shortPrompt)
            .replace(/{link_video}/g, videoUrl || "Buka Galeri Studio");

        return await this.sendWhatsApp(customerPhone, msg);
    }
}

window.xsender = new XsenderService();
