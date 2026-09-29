/**
 * api/send-wa.js — Serverless Endpoint Pengiriman WhatsApp (Proxy XSender)
 * Standar Keamanan & Performa:
 * 1. Mencegah error CORS di browser
 * 2. Mengamankan API key & koneksi gateway
 * 3. Memberikan status respon yang jelas ke admin
 */

const { formatPhone } = require('../lib/xsender');

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) {}
    }
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    const apiKey = body.api_key || body.apiKey || process.env.XSENDER_API_KEY || '';
    const sender = body.sender || process.env.XSENDER_SENDER || '';
    const rawNumber = body.number || body.phone || '';
    const message = body.message || '';
    const apiUrl = 'https://xsender.id/send-message';

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'XSender API Key belum diisi. Silakan masukkan API Key Anda di Menu Notifikasi WhatsApp Admin.' 
      });
    }

    if (!sender) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor Sender WhatsApp belum diisi. Masukkan nomor WhatsApp yang di-scan di dashboard xsender.id.' 
      });
    }

    const number = formatPhone(rawNumber);
    if (!number || number.length < 9) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor WhatsApp tujuan tidak valid. Contoh: 08123456789 atau 628123456789' 
      });
    }

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Isi pesan WhatsApp tidak boleh kosong.' 
      });
    }

    const payload = {
      api_key: apiKey,
      sender: formatPhone(sender),
      number: number,
      message: message,
      footer: body.footer || 'Sent via VIDORA Studio'
    };

    const xsenderResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const xsenderData = await xsenderResponse.json().catch(() => ({}));

    if (xsenderData.status === true) {
      return res.status(200).json({
        success: true,
        message: xsenderData.msg || 'Pesan WhatsApp berhasil dikirim ke ' + number,
        data: xsenderData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: xsenderData.msg || 'Gagal mengirim pesan via XSender. Pastikan Device di XSender terhubung (Connected) dan API Key sesuai.',
        data: xsenderData
      });
    }

  } catch (err) {
    console.error('[send-wa error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server: ' + err.message
    });
  }
};
