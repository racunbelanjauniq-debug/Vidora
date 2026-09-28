/**
 * lib/xsender.js — WhatsApp Gateway Service via XSender.id (Server-side Node.js)
 * VIDORA Studio Automation Engine
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const DEFAULT_TEMPLATES = {
  order: `Halo *{nama}* 👋,

Terima kasih telah memesan *VIDORA Creator Pass*!

📋 *Detail Pesanan Anda:*
• No Invoice: \`{invoice}\`
• Paket: *{paket}*
• Total: *Rp {total}*

💳 *Selesaikan Pembayaran via QRIS Pakasir:*
👉 {payment_url}

(Pembayaran diverifikasi otomatis via QRIS. Setelah pembayaran selesai, kuota 5 Profil Google Anda akan langsung aktif otomatis).

Salam hangat,
*Tim VIDORA Studio* 🚀`,

  approval: `🎉 *PEMBAYARAN DIVERIFIKASI & LISENSI AKTIF!*

Halo *{nama}* 👋,
Selamat! Pembayaran Anda untuk *{paket}* (\`{invoice}\`) telah diverifikasi.

✨ *Akun 5 Profil Google Anda kini telah AKTIF PENUH!*
🌐 Buka VIDORA Studio: https://vidora.biz.id/app.html

Fitur yang terbuka:
• Hingga 5 Profil Akun Google Terisolasi
• Semua Rasio Video (9:16, 16:9, 1:1, 4:5)
• Video Mixer & Multi-angle Concatenation
• Cloud Render & Direct Download

Terima kasih telah menjadi bagian dari Kreator VIDORA! 🎬`
};

/**
 * Mengambil setting dari database Supabase (system_settings)
 */
async function getXsenderConfig() {
  const defaults = {
    apiUrl: "https://api.xsender.id/v1/messages",
    apiToken: process.env.XSENDER_API_TOKEN || "",
    deviceId: process.env.XSENDER_DEVICE_ID || "",
    adminPhone: process.env.XSENDER_ADMIN_PHONE || "081234567890",
    cfg_pakasir_slug: process.env.PAKASIR_PROJECT_SLUG || "vidora",
    cfg_pakasir_key: process.env.PAKASIR_API_KEY || "",
    template_order: DEFAULT_TEMPLATES.order,
    template_approval: DEFAULT_TEMPLATES.approval
  };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return defaults;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.xsender_config&select=value`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
      return { ...defaults, ...rows[0].value };
    }
  } catch (e) {
    console.warn("[Xsender] Gagal baca system_settings:", e.message);
  }

  return defaults;
}

/**
 * Format nomor telepon ke format internasional (628xxx)
 */
function formatPhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("08")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("8")) cleaned = "62" + cleaned;
  return cleaned;
}

/**
 * Kirim pesan WhatsApp melalui API xsender.id
 */
async function sendWhatsAppMessage(targetPhone, message) {
  const config = await getXsenderConfig();
  const phone = formatPhone(targetPhone);

  if (!phone) {
    return { success: false, error: "Nomor telepon tidak valid" };
  }

  if (!config.apiToken) {
    console.log(`[XSender Mock / No Token] Ke: ${phone}\nPesan:\n${message}`);
    return { success: true, mock: true, message: "Token xsender belum diset, pesan dicatat di log." };
  }

  try {
    const res = await fetch(config.apiUrl || "https://api.xsender.id/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiToken}`
      },
      body: JSON.stringify({
        device_id: config.deviceId || undefined,
        to: phone,
        message: message
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || `HTTP ${res.status}` };
    }
  } catch (err) {
    console.error("[Xsender Error]:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Notifikasi saat pesanan baru dibuat (Checkout Pending)
 */
async function sendOrderCreatedNotification({ customerName, customerWa, invoice, planName, total, paymentUrl }) {
  const config = await getXsenderConfig();
  const template = config.template_order || DEFAULT_TEMPLATES.order;

  const msg = template
    .replace(/{nama}/gi, customerName || "Kreator")
    .replace(/{invoice}/gi, invoice || "INV-VID")
    .replace(/{paket}/gi, planName || "VIDORA Creator Pass")
    .replace(/{total}/gi, Number(total || 75000).toLocaleString("id-ID"))
    .replace(/{payment_url}/gi, paymentUrl || "https://app.pakasir.com/pay/vidora/75000");

  if (customerWa) {
    await sendWhatsAppMessage(customerWa, msg);
  }

  // Kirim juga alert ke Admin jika ada
  if (config.adminPhone) {
    const adminAlert = `🚨 *PESANAN BARU MASUK (VIDORA)*\n\n` +
      `• Invoice: \`${invoice}\`\n` +
      `• Pembeli: *${customerName}* (${customerWa || '-'})\n` +
      `• Total: *Rp ${Number(total || 75000).toLocaleString('id-ID')}*\n` +
      `• Paket: ${planName}\n\nMenunggu pembayaran via QRIS Pakasir.`;
    await sendWhatsAppMessage(config.adminPhone, adminAlert).catch(() => {});
  }
}

/**
 * Notifikasi saat pembayaran sukses diverifikasi (Order Paid / Lisensi Aktif)
 */
async function sendPaymentSuccessNotification({ customerName, customerWa, invoice, planName }) {
  const config = await getXsenderConfig();
  const template = config.template_approval || DEFAULT_TEMPLATES.approval;

  const msg = template
    .replace(/{nama}/gi, customerName || "Kreator")
    .replace(/{invoice}/gi, invoice || "INV-VID")
    .replace(/{paket}/gi, planName || "VIDORA Creator Pass");

  if (customerWa) {
    await sendWhatsAppMessage(customerWa, msg);
  }

  // Notifikasi ke Admin
  if (config.adminPhone) {
    const adminSuccess = `💰 *PEMBAYARAN DITERIMA & LISENSI AKTIF*\n\n` +
      `• Invoice: \`${invoice}\`\n` +
      `• Pembeli: *${customerName}* (${customerWa || '-'})\n` +
      `• Status: *LUNAS (5 Profil Google Aktif)*\n` +
      `• Gateway: *Pakasir QRIS Otomatis*`;
    await sendWhatsAppMessage(config.adminPhone, adminSuccess).catch(() => {});
  }
}

module.exports = {
  getXsenderConfig,
  sendWhatsAppMessage,
  sendOrderCreatedNotification,
  sendPaymentSuccessNotification
};
