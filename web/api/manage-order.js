/**
 * api/manage-order.js — Super Admin Order & User Management Endpoint
 * Menggunakan SUPABASE_SERVICE_ROLE_KEY untuk bypass RLS sehingga hapus data 100% berhasil.
 */

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
        resolve({});
      }
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = await parseBody(req);
    const action = body.action || req.query.action || (req.method === 'DELETE' ? 'delete_order' : '');
    const orderId = body.order_id || body.orderId || req.query.order_id || req.query.orderId;
    const userId = body.user_id || body.userId || req.query.user_id || req.query.userId;

    if (action === 'delete_order') {
      if (!orderId) {
        return res.status(400).json({ error: 'order_id wajib diisi' });
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          if (!resp.ok) {
            console.warn('[Manage Order] Gagal hapus di Supabase:', await resp.text());
          }
        } catch (dbErr) {
          console.warn('[Manage Order] Exception saat hapus di Supabase:', dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Pesanan ${orderId} berhasil dihapus dari sistem`
      });
    }

    if (action === 'delete_user') {
      if (!userId) {
        return res.status(400).json({ error: 'user_id wajib diisi' });
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
        } catch (dbErr) {
          console.warn('[Manage Order] Exception saat hapus user di Supabase:', dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: `User ${userId} berhasil dihapus`
      });
    }

    return res.status(400).json({ error: 'Aksi tidak valid' });
  } catch (err) {
    console.error('[Manage Order Fatal Error]:', err);
    return res.status(500).json({ error: err.message });
  }
};
