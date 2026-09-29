/**
 * lib/xsender.js — Integrasi WhatsApp Gateway via XSender.id (Server-side Node.js)
 * VIDORA Studio Automation Engine
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const FIXED_XSENDER_URL = "https://xsender.id/send-message";

const DEFAULT_TEMPLATES = {
  login: `Halo *{nama}* 👋,

Selamat datang di *VIDORA Studio*! 🚀
Akun Anda telah aktif dan siap digunakan:

📧 Email: *{email}*
📱 WhatsApp: *{phone}*
🌐 Akses Studio: https://vidora.biz.id/app

Mulai kreasi video produk AI tanpa batas dengan multi-sudut, subtitle otomatis, dan render cloud secepat kilat!

Salam hangat,
*Tim VIDORA Studio*`,

  order: `Halo *{nama}* 👋,

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

  follow_up_2: `Halo *{nama}* 😊,

Kami melihat pesanan *VIDORA Creator Pass* Anda (\`{invoice}\`) sebesar *Rp {total}* masih menunggu pembayaran via QRIS.

✨ *Keuntungan Creator Pass Aktif Anda:*
• 5 Akun Google Terisolasi (Bebas Limit & Anti-Banned)
• Video Mixer & Multi-angle Concatenation
• Cloud Render Resolusi Tinggi & Tanpa Watermark

Selesaikan pembayaran Anda sekarang melalui link QRIS resmi berikut:
👉 {payment_url}

Jika ada kendala saat scan QRIS, silakan balas pesan ini ya Kak. Terima kasih! 🙏`,

  follow_up_3: `Halo *{nama}* ⚠️,

Ini adalah pengingat terakhir untuk tagihan pesanan *VIDORA Creator Pass* Anda:
No Invoice: \`{invoice}\` (Total: *Rp {total}*)

Promo harga spesial Rp 75.000 / bulan untuk 5 Profil Google akan segera ditutup. Segera amankan kuota akun Anda sekarang:
👉 {payment_url}

Butuh bantuan pembayaran atau transfer manual? Admin kami siap membantu, cukup balas pesan ini sekarang ya Kak.

Salam sukses,
*Tim VIDORA Studio* 🚀`,

  approval: `🎉 *PEMBAYARAN DIVERIFIKASI & LISENSI AKTIF!*

Halo *{nama}* 👋,
Selamat! Pembayaran Anda untuk *{paket}* (\`{invoice}\`) telah diverifikasi.

✨ *Akun 5 Profil Google Anda kini telah AKTIF PENUH!*
🌐 Buka VIDORA Studio: https://vidora.biz.id/app

Fitur yang terbuka:
• Hingga 5 Profil Akun Google Terisolasi
• Semua Rasio Video (9:16, 16:9, 1:1, 4:5)
• Video Mixer & Multi-angle Concatenation
• Cloud Render & Direct Download

Terima kasih telah menjadi bagian dari Kreator VIDORA! 🎬`
};

/**
 * Format nomor telepon ke format internasional 628xxx
 */
function formatPhone(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (clean.startsWith("8")) {
    clean = "62" + clean;
  }
  return clean;
}

/**
 * Mengambil setting dari database Supabase (system_settings)
 */
async function getXsenderConfig() {
  const defaults = {
    apiKey: process.env.XSENDER_API_KEY || "",
    sender: process.env.XSENDER_SENDER || "",
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
      const val = rows[0].value;
      return {
        ...defaults,
        apiKey: val.apiKey || val.apiToken || defaults.apiKey,
        sender: val.sender || val.deviceId || defaults.sender,
        adminPhone: val.adminPhone || defaults.adminPhone,
        template_order: val.template_order || defaults.template_order,
        template_approval: val.template_approval || defaults.template_approval
      };
    }
  } catch (e) {
    console.warn("[Xsender] Gagal baca system_settings:", e.message);
  }

  return defaults;
}

/**
 * Kirim pesan WhatsApp melalui API xsender.id (Format Resmi XSender)
 */
async function sendWhatsAppMessage(targetNumber, message, options = {}) {
  const formattedPhone = formatPhone(targetNumber);
  if (!formattedPhone) {
    console.warn('[XSender] Nomor WhatsApp tidak valid:', targetNumber);
    return { success: false, error: 'Nomor WhatsApp tidak valid' };
  }

  const config = await getXsenderConfig();
  const apiKey = (options && options.apiKey) || config.apiKey;
  const senderNumber = (options && options.sender) || config.sender;

  if (!apiKey) {
    console.warn(`[XSender WA Simu to ${formattedPhone}]: API Key belum diisi`);
    return { success: false, error: 'API Key XSender belum diisi di Pengaturan Gateway Admin' };
  }

  if (!senderNumber) {
    console.warn(`[XSender WA Simu to ${formattedPhone}]: Nomor Sender belum diisi`);
    return { success: false, error: 'Nomor Sender WhatsApp belum diisi di Pengaturan Gateway Admin' };
  }

  try {
    const payload = {
      api_key: apiKey,
      sender: formatPhone(senderNumber),
      number: formattedPhone,
      message: message,
      footer: 'Sent via VIDORA Studio'
    };

    const response = await fetch(FIXED_XSENDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    console.log(`[XSender WA Sent to ${formattedPhone}]:`, result);

    return {
      success: result.status === true,
      error: result.status === true ? null : (result.msg || 'Gagal mengirim pesan via XSender'),
      data: result
    };

  } catch (error) {
    console.error('[XSender Send Error]:', error.message);
    return { success: false, error: error.message };
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
    await sendWhatsAppMessage(customerWa, msg).catch(() => {});
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
    await sendWhatsAppMessage(customerWa, msg).catch(() => {});
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

/**
 * Notifikasi Sambutan User Login / Registrasi Baru
 */
async function sendUserLoginNotification({ name, email, phone }) {
  if (!phone) return;
  const config = await getXsenderConfig();
  const template = config.template_login || DEFAULT_TEMPLATES.login;

  const msg = template
    .replace(/{nama}/gi, name || "Kreator")
    .replace(/{email}/gi, email || "-")
    .replace(/{phone}/gi, phone || "-");

  return sendWhatsAppMessage(phone, msg).catch(() => {});
}

/**
 * Notifikasi Follow-up Tahap 2 (Pengingat Belum Bayar 15-30 Menit)
 */
async function sendFollowUpStage2Notification({ customerName, customerWa, invoice, planName, total, paymentUrl }) {
  if (!customerWa) return;
  const config = await getXsenderConfig();
  const template = config.template_follow_up_2 || DEFAULT_TEMPLATES.follow_up_2;

  const msg = template
    .replace(/{nama}/gi, customerName || "Kreator")
    .replace(/{invoice}/gi, invoice || "")
    .replace(/{paket}/gi, planName || "VIDORA Creator Pass")
    .replace(/{total}/gi, Number(total || 75000).toLocaleString('id-ID'))
    .replace(/{payment_url}/gi, paymentUrl || "");

  return sendWhatsAppMessage(customerWa, msg).catch(() => {});
}

/**
 * Notifikasi Follow-up Tahap 3 (Urgent / Promo Terakhir)
 */
async function sendFollowUpStage3Notification({ customerName, customerWa, invoice, planName, total, paymentUrl }) {
  if (!customerWa) return;
  const config = await getXsenderConfig();
  const template = config.template_follow_up_3 || DEFAULT_TEMPLATES.follow_up_3;

  const msg = template
    .replace(/{nama}/gi, customerName || "Kreator")
    .replace(/{invoice}/gi, invoice || "")
    .replace(/{paket}/gi, planName || "VIDORA Creator Pass")
    .replace(/{total}/gi, Number(total || 75000).toLocaleString('id-ID'))
    .replace(/{payment_url}/gi, paymentUrl || "");

  return sendWhatsAppMessage(customerWa, msg).catch(() => {});
}

module.exports = {
  getXsenderConfig,
  sendWhatsAppMessage,
  sendUserLoginNotification,
  sendOrderCreatedNotification,
  sendFollowUpStage2Notification,
  sendFollowUpStage3Notification,
  sendPaymentSuccessNotification,
  formatPhone,
  DEFAULT_TEMPLATES
};
