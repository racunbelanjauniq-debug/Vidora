/**
 * api/create-order.js — Inisiasi Pesanan & URL Pembayaran Pakasir
 * 
 * Endpoint: POST /api/create-order
 * Menerima data pesanan dari form checkout VIDORA Studio, mencatat pesanan,
 * mengirim notifikasi WhatsApp via XSender, dan mengembalikan link pembayaran Pakasir QRIS.
 */

const { sendOrderCreatedNotification, getXsenderConfig } = require('../lib/xsender');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DEFAULT_SLUG = process.env.PAKASIR_PROJECT_SLUG || "vidora";

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        try {
          const qs = require('querystring');
          resolve(qs.parse(data));
        } catch {
          resolve({});
        }
      }
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    const {
      name = '',
      phone = '',
      email = '',
      plan = 'VIDORA Creator Pass',
      price = 75000,
      payment_method = 'qris_pakasir',
      return_url = '',
      user_id = null
    } = body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nama dan nomor WhatsApp wajib diisi' });
    }

    const config = await getXsenderConfig().catch(() => ({}));
    const activeSlug = config.cfg_pakasir_slug || DEFAULT_SLUG;
    const nominal = parseInt(price) || 75000;

    // Generate unique Order ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `INV-VID-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    // Target Redirect setelah bayar di app.pakasir.com
    const redirectTarget = return_url || `https://vidora.biz.id/app.html?order_id=${orderId}&status=success`;
    const paymentUrl = `https://app.pakasir.com/pay/${activeSlug}/${nominal}?order_id=${orderId}&redirect=${encodeURIComponent(redirectTarget)}`;

    const orderData = {
      id: orderId,
      user_id: user_id || null,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim().toLowerCase() || null,
      plan_name: plan,
      price: nominal,
      payment_method: payment_method || 'qris_pakasir',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Simpan ke Supabase jika credentials tersedia
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });
      } catch (e) {
        console.warn('[Create Order] Supabase insert warning:', e.message);
      }
    }

    // Kirim notifikasi pesanan ke WhatsApp via xsender
    if (phone) {
      sendOrderCreatedNotification({
        customerName: name,
        customerWa: phone,
        invoice: orderId,
        planName: plan,
        total: nominal,
        paymentUrl: paymentUrl
      }).catch(err => console.warn('[Create Order] Xsender notify warning:', err.message));
    }

    return res.status(200).json({
      success: true,
      order_id: orderId,
      payment_url: paymentUrl,
      order: orderData
    });

  } catch (err) {
    console.error('[Create Order Fatal Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
