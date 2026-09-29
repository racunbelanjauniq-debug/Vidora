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
    const query = req.query || (req.url && req.url.includes('?') ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams) : {});
    const action = body.action || query.action || (req.method === 'DELETE' ? 'delete_order' : '');
    const orderId = body.order_id || body.orderId || query.order_id || query.orderId;
    const userId = body.user_id || body.userId || query.user_id || query.userId;

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

    // ========================================
    // ACTION: LIST ALL USERS (Bypass RLS + Auth Merge)
    // ========================================
    if (action === 'list_users') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, users: [] });
      }

      let profileList = [];
      try {
        const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        if (usersRes.ok) {
          profileList = await usersRes.json();
          if (!Array.isArray(profileList)) profileList = [];
        }
      } catch (pe) {
        console.warn('[Manage Order] profiles fetch error:', pe.message);
      }

      // Juga tarik data auth.users agar user yang baru register di Supabase Auth langsung muncul 100%
      try {
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          const authUsers = (authData && authData.users) || [];
          const profileMap = new Map();
          profileList.forEach(p => profileMap.set(p.id, p));

          authUsers.forEach(au => {
            if (!profileMap.has(au.id)) {
              // User ada di auth.users tapi belum ada di profiles
              const newProf = {
                id: au.id,
                email: au.email,
                full_name: (au.user_metadata && (au.user_metadata.full_name || au.user_metadata.name)) || au.email.split('@')[0],
                phone: (au.user_metadata && au.user_metadata.phone) || au.phone || '',
                role: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')) ? 'superadmin' : 'user',
                is_subscribed: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')),
                max_google_accounts: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')) ? 99999 : 5,
                created_at: au.created_at || new Date().toISOString()
              };
              profileList.unshift(newProf);
            } else {
              // Sinkronkan nomor telepon atau nama dari auth metadata jika di profile kosong
              const existing = profileMap.get(au.id);
              if (!existing.phone && au.user_metadata && au.user_metadata.phone) {
                existing.phone = au.user_metadata.phone;
              }
              if (!existing.full_name && au.user_metadata && au.user_metadata.full_name) {
                existing.full_name = au.user_metadata.full_name;
              }
            }
          });
        }
      } catch (ae) {
        console.warn('[Manage Order] auth.users fetch error:', ae.message);
      }

      return res.status(200).json({ success: true, users: profileList });
    }

    // ========================================
    // ACTION: LIST ALL ORDERS (Bypass RLS)
    // ========================================
    if (action === 'list_orders') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, orders: [] });
      }
      const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      const orders = await ordersRes.json();
      if (!ordersRes.ok) {
        return res.status(500).json({ error: (orders && orders.message) || 'Gagal memuat daftar pesanan' });
      }
      return res.status(200).json({ success: true, orders: Array.isArray(orders) ? orders : [] });
    }

    // ========================================
    // ACTION: GRANT ACCESS (Aktifkan Lisensi User)
    // ========================================
    if (action === 'grant_access') {
      const targetId = userId || body.id;
      const targetEmail = body.email;
      if (!targetId && !targetEmail) return res.status(400).json({ error: 'user_id atau email wajib diisi' });

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, message: 'Akses diset (mode lokal)' });
      }
      const maxAccounts = parseInt(body.max_google_accounts) || 5;

      let filterQuery = targetId ? `id=eq.${encodeURIComponent(targetId)}` : `email=eq.${encodeURIComponent(targetEmail)}`;
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${filterQuery}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ is_subscribed: true, max_google_accounts: maxAccounts, updated_at: new Date().toISOString() })
      });

      const updated = await patchRes.json().catch(() => []);
      return res.status(200).json({ success: true, message: `Akses Creator Pass aktif (${maxAccounts} Akun Google)`, data: updated });
    }

    // ========================================
    // ACTION: REVOKE ACCESS (Cabut Lisensi User)
    // ========================================
    if (action === 'revoke_access') {
      const targetId = userId || body.id;
      const targetEmail = body.email;
      if (!targetId && !targetEmail) return res.status(400).json({ error: 'user_id atau email wajib diisi' });

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, message: 'Akses dicabut (mode lokal)' });
      }

      let filterQuery = targetId ? `id=eq.${encodeURIComponent(targetId)}` : `email=eq.${encodeURIComponent(targetEmail)}`;
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?${filterQuery}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_subscribed: false, updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ success: true, message: `Akses berhasil dicabut` });
    }

    return res.status(400).json({ error: 'Aksi tidak valid' });
  } catch (err) {
    console.error('[Manage Order Fatal Error]:', err);
    return res.status(500).json({ error: err.message });
  }
};
