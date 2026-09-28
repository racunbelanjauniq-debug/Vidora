/**
 * api/settings.js — API Pengaturan Sistem & Gateway Pakasir
 * 
 * Endpoint:
 * GET  /api/settings — Ambil seluruh pengaturan tersimpan
 * POST /api/settings — Simpan / perbarui pengaturan (Pakasir & WhatsApp)
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

  // GET Settings
  if (req.method === 'GET') {
    const defaults = {
      cfg_payment_qris_active: 'true',
      cfg_pakasir_slug: 'vidora',
      cfg_pakasir_key: '',
      cfg_pakasir_secret: '',
      cfg_xsender_key: '',
      cfg_xsender_sender: '',
      cfg_xsender_admin: '081234567890'
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({ success: true, settings: defaults });
    }

    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      const rows = await resp.json();
      const map = { ...defaults };
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.key && r.value) {
            if (typeof r.value === 'object') {
              Object.assign(map, r.value);
            } else {
              map[r.key] = r.value;
            }
          }
        });
      }
      return res.status(200).json({ success: true, settings: map });
    } catch (e) {
      return res.status(200).json({ success: true, settings: defaults });
    }
  }

  // POST Settings
  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const settings = body.settings || body;

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              key: 'pakasir_config',
              value: settings,
              updated_at: new Date().toISOString()
            })
          });
        } catch (e) {
          console.warn('[system_settings table error]:', e.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Pengaturan berhasil disimpan!' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
