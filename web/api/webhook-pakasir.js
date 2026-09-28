/**
 * api/webhook-pakasir.js — Webhook Handler untuk Pakasir Payment Gateway
 * 
 * Menerima callback realtime dari app.pakasir.com saat pembayaran QRIS pelanggan berhasil,
 * dan langsung mengaktifkan status langganan Creator Pass (5 Akun Google) secara otomatis.
 */

const { sendPaymentSuccessNotification } = require('../lib/xsender');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

  // GET / HEAD request untuk tes konektivitas webhook di admin atau browser / uptime checker
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({
      status: 'active',
      service: 'VIDORA Studio Pakasir Webhook Fulfillment Engine',
      gateway: 'app.pakasir.com',
      time: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = await parseBody(req);
    console.log('[Pakasir Webhook Received]:', JSON.stringify(payload));

    const {
      amount,
      order_id,
      project,
      status,
      payment_method,
      completed_at
    } = payload;

    if (!order_id) {
      return res.status(400).json({ error: 'order_id wajib disertakan dalam payload' });
    }

    // Hanya proses jika status transaksi 'completed'
    if (status !== 'completed') {
      return res.status(200).json({
        status: 'ignored',
        message: `Status transaksi '${status}' bukan 'completed'. Diabaikan.`
      });
    }

    const nominal = parseFloat(amount) || 75000;

    // 1. Cari data di tabel orders Supabase jika ada
    let customerEmail = '';
    let customerName = '';
    let customerPhone = '';
    let targetUserId = null;
    let isAlreadyPaid = false;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const orderRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          }
        );
        const orders = await orderRes.json();
        if (Array.isArray(orders) && orders.length > 0) {
          const ord = orders[0];
          customerEmail = ord.customer_email || '';
          customerName = ord.customer_name || '';
          customerPhone = ord.customer_phone || '';
          targetUserId = ord.user_id || null;
          if (ord.status === 'paid') {
            isAlreadyPaid = true;
          }
        }
      } catch (e) {
        console.warn('[Pakasir Webhook] Orders check warning:', e.message);
      }
    }

    // Idempotency: Jika sudah pernah dibayar, langsung return sukses
    if (isAlreadyPaid) {
      console.log(`[Pakasir Webhook] Pesanan ${order_id} sudah lunas sebelumnya.`);
      return res.status(200).json({
        status: 'ok',
        duplicate: true,
        order_id: order_id,
        message: 'Pesanan sudah aktif sebelumnya.'
      });
    }

    // 2. Update status order menjadi 'paid' di Supabase
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'paid',
              payment_method: payment_method || 'qris_pakasir',
              pakasir_payload: payload,
              updated_at: new Date().toISOString()
            })
          }
        );
      } catch (e) {
        console.warn('[Pakasir Webhook] Orders patch warning:', e.message);
      }

      // 3. Aktivasi status akun (is_subscribed = true, max_google_accounts = 5)
      try {
        if (targetUserId) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                is_subscribed: true,
                max_google_accounts: 5,
                updated_at: new Date().toISOString()
              })
            }
          );
        } else if (customerEmail) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                is_subscribed: true,
                max_google_accounts: 5,
                updated_at: new Date().toISOString()
              })
            }
          );
        }
      } catch (e) {
        console.warn('[Pakasir Webhook] Profile activation warning:', e.message);
      }
    }

    console.log(`[Pakasir Webhook SUCCESS] Order ${order_id} lunas & akun Creator Pass 5 Akun diaktifkan!`);

    // 4. Kirim notifikasi WhatsApp lisensi aktif via xsender
    if (customerPhone) {
      sendPaymentSuccessNotification({
        customerName: customerName || 'Kreator VIDORA',
        customerWa: customerPhone,
        invoice: order_id,
        planName: 'VIDORA Creator Pass (5 Profil Google)'
      }).catch(err => console.error('[XSender Payment Notif Error]:', err.message));
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Pembayaran Pakasir berhasil dikonfirmasi. Lisensi 5 Profil Google telah aktif!',
      order_id: order_id,
      amount: nominal,
      completed_at: completed_at || new Date().toISOString()
    });

  } catch (err) {
    console.error('[Pakasir Webhook Fatal Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
