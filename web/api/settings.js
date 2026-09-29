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

async function upsertSetting(key, value) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    // 1. Coba PATCH dulu jika row sudah ada
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        value: value,
        updated_at: new Date().toISOString()
      })
    });
    const patchData = await patchRes.json().catch(() => []);
    if (Array.isArray(patchData) && patchData.length > 0) {
      console.log(`[settings] PATCH ${key} sukses`);
      return true;
    }

    // 2. Jika belum ada, INSERT dengan on_conflict=key
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?on_conflict=key`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: key,
        value: value,
        updated_at: new Date().toISOString()
      })
    });
    console.log(`[settings] POST ${key} status:`, postRes.status);
    return postRes.ok;
  } catch (err) {
    console.error(`[settings upsert error for ${key}]:`, err.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET Settings
  if (req.method === 'GET') {
    const settings = {
      cfg_payment_qris_active: 'true',
      cfg_pakasir_slug: 'vidora',
      cfg_pakasir_key: '',
      cfg_pakasir_secret: '',
      cfg_xsender_key: '',
      cfg_xsender_sender: '',
      cfg_xsender_admin: '081234567890'
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({ success: true, settings });
    }

    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (resp.ok) {
        const rows = await resp.json();
        if (Array.isArray(rows)) {
          rows.forEach(r => {
            if (r.key && r.value) {
              if (r.key === 'bank_config' && typeof r.value === 'object') {
                settings.has_saved_bank = true;
                Object.assign(settings, r.value);
              } else if (typeof r.value === 'object') {
                Object.assign(settings, r.value);
              } else {
                settings[r.key] = r.value;
              }
            }
          });
        }
      }
      return res.status(200).json({ success: true, settings });
    } catch (e) {
      return res.status(200).json({ success: true, settings });
    }
  }

  // POST Settings
  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const settings = body.settings || body;

      // 1. Simpan Bank Config jika ada data bank
      if (settings.cfg_bca_number !== undefined || settings.bca_number !== undefined || settings.cfg_mandiri_number !== undefined) {
        const bankData = {
          cfg_bca_number: settings.cfg_bca_number || settings.bca_number || '',
          cfg_bca_name: settings.cfg_bca_name || settings.bca_name || '',
          cfg_mandiri_number: settings.cfg_mandiri_number || '',
          cfg_mandiri_name: settings.cfg_mandiri_name || '',
          updated_at: new Date().toISOString()
        };
        await upsertSetting('bank_config', bankData);
      }

      // 2. Simpan Pakasir Config jika ada data pakasir
      if (settings.cfg_pakasir_slug !== undefined || settings.cfg_pakasir_key !== undefined || settings.cfg_payment_qris_active !== undefined) {
        await upsertSetting('pakasir_config', settings);
      }

      return res.status(200).json({ success: true, message: 'Pengaturan berhasil disimpan secara permanen!' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
