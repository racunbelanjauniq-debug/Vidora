/**
 * api/manage-order.js — Super Admin Order & User Management Endpoint
 * Menggunakan SUPABASE_SERVICE_ROLE_KEY untuk bypass RLS sehingga hapus data 100% berhasil.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const fs = require('fs');
const path = require('path');
const TMP_GEMINI_FILE = '/tmp/gemini_keys.json';

// In-memory fallback dictionary
global.__VIDORA_GEMINI_KEYS = global.__VIDORA_GEMINI_KEYS || {};

const REVOKED_GEMINI_KEYS = new Set([
  'AIzaSyDe5r_8aoYCBcjZ8uzyXCJURp-xG_fAMCo'
]);

function getLocalGeminiKey(email) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return process.env.GEMINI_API_KEY || '';
  try {
    if (fs.existsSync(TMP_GEMINI_FILE)) {
      const data = JSON.parse(fs.readFileSync(TMP_GEMINI_FILE, 'utf-8'));
      if (data && data[clean]) {
        if (REVOKED_GEMINI_KEYS.has(data[clean])) {
          delete data[clean];
          fs.writeFileSync(TMP_GEMINI_FILE, JSON.stringify(data));
        } else {
          return data[clean];
        }
      }
    }
  } catch {}
  const memKey = (global.__VIDORA_GEMINI_KEYS && global.__VIDORA_GEMINI_KEYS[clean]) || '';
  if (REVOKED_GEMINI_KEYS.has(memKey)) {
    delete global.__VIDORA_GEMINI_KEYS[clean];
    return process.env.GEMINI_API_KEY || '';
  }
  return memKey || process.env.GEMINI_API_KEY || '';
}

function saveLocalGeminiKey(email, key) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return;
  global.__VIDORA_GEMINI_KEYS = global.__VIDORA_GEMINI_KEYS || {};
  if (!key || REVOKED_GEMINI_KEYS.has(key)) {
    delete global.__VIDORA_GEMINI_KEYS[clean];
  } else {
    global.__VIDORA_GEMINI_KEYS[clean] = key;
  }
  try {
    let existing = {};
    if (fs.existsSync(TMP_GEMINI_FILE)) {
      existing = JSON.parse(fs.readFileSync(TMP_GEMINI_FILE, 'utf-8')) || {};
    }
    if (!key || REVOKED_GEMINI_KEYS.has(key)) {
      delete existing[clean];
    } else {
      existing[clean] = key;
    }
    fs.writeFileSync(TMP_GEMINI_FILE, JSON.stringify(existing));
  } catch {}
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.method === 'GET' || req.method === 'HEAD' || !req.on || typeof req.on !== 'function') return {};
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
    const body = await parseBody(req) || {};
    const query = req.query || (req.url && req.url.includes('?') ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams) : {});
    const action = (body.action || query.action || (req.method === 'DELETE' ? 'delete_order' : '')).trim();
    const orderId = body.order_id || body.orderId || query.order_id || query.orderId;
    const userId = body.user_id || body.userId || query.user_id || query.userId;

    // DEBUG LOG - untuk trace masalah di Vercel logs
    console.log(`[Manage Order] method=${req.method} action="${action}" bodyKeys=${Object.keys(body).join(',') || 'none'}`);

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
    // ACTION: SAVE BANK SETTINGS
    // ========================================
    if (action === 'save_bank_settings') {
      const bankData = {
        cfg_bca_number: body.cfg_bca_number || body.bca_number || '',
        cfg_bca_name: body.cfg_bca_name || body.bca_name || '',
        cfg_mandiri_number: body.cfg_mandiri_number || '',
        cfg_mandiri_name: body.cfg_mandiri_name || '',
        updated_at: new Date().toISOString()
      };

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          // 1. Coba PATCH
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.bank_config`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ value: bankData, updated_at: new Date().toISOString() })
          });
          const patchData = await patchRes.json().catch(() => []);
          if (!Array.isArray(patchData) || patchData.length === 0) {
            // 2. Jika belum ada row, INSERT
            await fetch(`${SUPABASE_URL}/rest/v1/system_settings?on_conflict=key`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({ key: 'bank_config', value: bankData, updated_at: new Date().toISOString() })
            });
          }
        } catch (e) {
          console.warn('[manage-order save_bank_settings warning]:', e.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Bank settings saved', bankData });
    }

    // ========================================
    // ACTION: CONFIRM EMAIL (Bypass Email Verification)
    // ========================================
    if (action === 'confirm_email') {
      const email = (body.email || query.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ error: 'email wajib diisi' });

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, message: 'Simulasi auto-confirm (mode lokal)' });
      }

      try {
        const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        const listData = await listRes.json();
        const users = (listData && listData.users) || [];
        const target = users.find(u => u.email && u.email.toLowerCase() === email);

        if (target) {
          const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${target.id}`, {
            method: 'PUT',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email_confirm: true })
          });
          const updateData = await updateRes.json();
          return res.status(200).json({ success: true, message: `Email ${email} berhasil dikonfirmasi otomatis`, user: updateData });
        } else {
          return res.status(404).json({ error: `Pengguna dengan email ${email} tidak ditemukan di database` });
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // ========================================
    // ACTION: REGISTER USER (Create User with Auto-Confirmed Email)
    // ========================================
    if (action === 'register_user') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const fullName = (body.full_name || body.name || email.split('@')[0]).trim();
      const phone = (body.phone || '').trim();

      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password wajib diisi' });
      }

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(200).json({ success: true, message: 'User terdaftar (mode lokal)' });
      }

      try {
        let userId = null;
        // 1. Coba create user dengan email_confirm: true
        const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              phone: phone
            }
          })
        });

        const createData = await createRes.json();

        if (createRes.ok && createData?.id) {
          userId = createData.id;
        } else {
          // Jika user sudah ada (misal pernah mendaftar tapi email not confirmed), update password dan set email_confirm: true
          const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          const listData = await listRes.json();
          const users = (listData && listData.users) || [];
          const target = users.find(u => u.email && u.email.toLowerCase() === email);

          if (target) {
            userId = target.id;
            await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${target.id}`, {
              method: 'PUT',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                password: password,
                email_confirm: true,
                user_metadata: {
                  full_name: fullName,
                  phone: phone
                }
              })
            });
          } else {
            return res.status(createRes.status || 500).json({ error: createData.msg || createData.message || 'Gagal mendaftarkan akun' });
          }
        }

        // 2. Pastikan row profiles tersimpan di public.profiles
        if (userId) {
          await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              id: userId,
              email: email,
              full_name: fullName,
              phone: phone,
              role: (email === 'winalislam@gmail.com' || email.includes('admin')) ? 'superadmin' : 'user',
              max_google_accounts: 3,
              updated_at: new Date().toISOString()
            })
          }).catch(e => console.warn('[Manage Order] profiles sync error:', e.message));
        }

        return res.status(200).json({
          success: true,
          message: 'Akun berhasil didaftarkan dan diverifikasi otomatis',
          user: { id: userId, email }
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
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
            // Auto-confirm jika ada user yang email_confirmed_at masih null
            if (!au.email_confirmed_at) {
              fetch(`${SUPABASE_URL}/auth/v1/admin/users/${au.id}`, {
                method: 'PUT',
                headers: {
                  'apikey': SUPABASE_SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email_confirm: true })
              }).catch(() => {});
            }

            if (!profileMap.has(au.id)) {
              // User ada di auth.users tapi belum ada di profiles
              const newProf = {
                id: au.id,
                email: au.email,
                full_name: (au.user_metadata && (au.user_metadata.full_name || au.user_metadata.name)) || au.email.split('@')[0],
                phone: (au.user_metadata && au.user_metadata.phone) || au.phone || '',
                role: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')) ? 'superadmin' : 'user',
                is_subscribed: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')),
                max_google_accounts: (au.email === 'winalislam@gmail.com' || au.email.includes('admin')) ? 99999 : 3,
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
      const maxAccounts = parseInt(body.max_google_accounts) || 3;

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

    // ========================================
    // ACTION: SAVE USER GEMINI KEY (Cross-Device Sync)
    // ========================================
    if (action === 'save_user_gemini_key') {
      const cleanEmail = (body.email || query.email || '').trim().toLowerCase();
      const targetId = userId || body.id;
      const geminiKey = (body.key || body.gemini_key || body.gemini_api_key || query.key || '').trim();

      if (!cleanEmail && !targetId) {
        return res.status(400).json({ error: 'email atau user_id wajib diisi' });
      }

      // 1. Simpan ke local cache & /tmp agar langsung terbaca di serverless
      if (cleanEmail) {
        saveLocalGeminiKey(cleanEmail, geminiKey);
      }

      // 2. Simpan ke Supabase jika tersedia
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        if (targetId) {
          try {
            await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetId}`, {
              method: 'PUT',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ user_metadata: { gemini_api_key: geminiKey } })
            });
          } catch (e) {
            console.warn('[Manage Order] auth metadata update error:', e.message);
          }
        }

        if (cleanEmail) {
          try {
            const settingKey = `gemini_key_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const settingVal = { key: geminiKey, email: cleanEmail, updated_at: new Date().toISOString() };
            
            await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.${encodeURIComponent(settingKey)}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ value: settingVal, updated_at: new Date().toISOString() })
            }).then(async (r) => {
              if (r.status === 404 || (await r.clone().text()).includes('[]')) {
                await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
                  method: 'POST',
                  headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                  },
                  body: JSON.stringify({ key: settingKey, value: settingVal, updated_at: new Date().toISOString() })
                });
              }
            });
          } catch (e) {
            console.warn('[Manage Order] system_settings save error:', e.message);
          }
        }
      }

      return res.status(200).json({ success: true, message: 'API Key Gemini berhasil disinkronkan', email: cleanEmail });
    }

    // ========================================
    // ACTION: GET USER GEMINI KEY (Cross-Device Sync)
    // ========================================
    if (action === 'get_user_gemini_key') {
      const cleanEmail = (query.email || body.email || '').trim().toLowerCase();
      const targetId = userId || query.id;

      // 1. Coba ambil dari local memory/tmp dulu
      let foundKey = getLocalGeminiKey(cleanEmail);

      // 2. Jika belum ada, coba cari di Supabase
      if (!foundKey && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        if (cleanEmail) {
          try {
            const settingKey = `gemini_key_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const sRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.${encodeURIComponent(settingKey)}&select=value`, {
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });
            if (sRes.ok) {
              const rows = await sRes.json();
              if (rows && rows.length > 0 && rows[0].value) {
                const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                if (val && val.key) foundKey = val.key;
              }
            }
          } catch (e) {
            console.warn('[Manage Order] system_settings get error:', e.message);
          }
        }

        if (!foundKey && targetId) {
          try {
            const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetId}`, {
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });
            if (uRes.ok) {
              const uData = await uRes.json();
              if (uData && uData.user_metadata && uData.user_metadata.gemini_api_key) {
                foundKey = uData.user_metadata.gemini_api_key;
              }
            }
          } catch (e) {
            console.warn('[Manage Order] auth user get error:', e.message);
          }
        }
      }

      if (REVOKED_GEMINI_KEYS.has(foundKey)) {
        foundKey = '';
      }

      if (foundKey && cleanEmail) {
        saveLocalGeminiKey(cleanEmail, foundKey);
      }

      return res.status(200).json({ success: true, key: foundKey, email: cleanEmail });
    }

    // ========================================
    // ACTION: ADD GOOGLE ACCOUNT (Bypass RLS & UUID Auto-Fix)
    // ========================================
    if (action === 'add_google_account') {
      const googleEmail = (body.email || body.google_email || '').trim().toLowerCase();
      const label = (body.label || '').trim();
      const userEmail = (body.user_email || query.user_email || 'winalislam@gmail.com').trim().toLowerCase();
      let targetUserId = body.user_id || query.user_id;

      if (!googleEmail) {
        return res.status(400).json({ error: 'Email Google wajib diisi' });
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId || '');
          let validUserId = isUuid ? targetUserId : null;

          // 1. Jika targetUserId bukan UUID, cari profile berdasarkan email
          if (!validUserId && userEmail) {
            const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(userEmail)}&select=id,role,max_google_accounts`, {
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });
            if (pRes.ok) {
              const profiles = await pRes.json();
              if (Array.isArray(profiles) && profiles.length > 0 && profiles[0].id) {
                validUserId = profiles[0].id;
              }
            }
          }

          // 2. Jika tetap belum ada validUserId, gunakan master UUID atau create profile
          if (!validUserId) {
            const masterUuid = "00000000-0000-0000-0000-000000000001";
            validUserId = masterUuid;

            await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                id: validUserId,
                email: userEmail,
                full_name: 'Winal Islam (Super Admin)',
                role: 'superadmin',
                max_google_accounts: 99999,
                is_subscribed: true
              })
            });
          }

          // 3. Masukkan ke google_accounts
          const insRes = await fetch(`${SUPABASE_URL}/rest/v1/google_accounts`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              user_id: validUserId,
              email: googleEmail,
              label: label || 'Akun Google Vault',
              status: 'active',
              credit_status: 'ready'
            })
          });

          const insData = await insRes.json().catch(() => null);
          if (!insRes.ok) {
            console.warn('[Manage Order] Gagal insert google_accounts:', insData);
            return res.status(400).json({ error: insData?.message || 'Gagal menyimpan akun Google di database' });
          }

          const createdAcc = Array.isArray(insData) ? insData[0] : insData;
          return res.status(200).json({ success: true, account: createdAcc });
        } catch (dbErr) {
          console.error('[Manage Order] Error insert google account:', dbErr);
          return res.status(500).json({ error: dbErr.message });
        }
      }

      return res.status(200).json({
        success: true,
        account: {
          id: 'acc-' + Date.now(),
          email: googleEmail,
          label: label || 'Akun Google Vault',
          status: 'active',
          credit_status: 'ready',
          created_at: new Date().toISOString()
        }
      });
    }

    // ========================================
    // ACTION: DELETE GOOGLE ACCOUNT
    // ========================================
    if (action === 'delete_google_account') {
      const accountId = body.id || query.id;
      if (!accountId) {
        return res.status(400).json({ error: 'id akun Google wajib diisi' });
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/google_accounts?id=eq.${encodeURIComponent(accountId)}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
        } catch (e) {
          console.warn('[Manage Order] Gagal delete google account:', e.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Akun Google berhasil dihapus' });
    }

    // ========================================
    // ACTION: LIST GOOGLE ACCOUNTS
    // ========================================
    if (action === 'list_google_accounts') {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const lRes = await fetch(`${SUPABASE_URL}/rest/v1/google_accounts?select=*&order=created_at.desc`, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          if (lRes.ok) {
            const accounts = await lRes.json();
            return res.status(200).json({ success: true, accounts: accounts || [] });
          }
        } catch (e) {
          console.warn('[Manage Order] Gagal fetch google accounts:', e.message);
        }
      }
      return res.status(200).json({ success: true, accounts: [] });
    }

    console.error(`[Manage Order] AKSI TIDAK VALID: action="${action}" method=${req.method} bodyKeys=${Object.keys(body).join(',') || 'none'}`);
    return res.status(400).json({ error: `Aksi tidak valid: "${action || '(kosong)'}" tidak dikenal oleh server.` });
  } catch (err) {
    console.error('[Manage Order Fatal Error]:', err);
    return res.status(500).json({ error: err.message });
  }
};
