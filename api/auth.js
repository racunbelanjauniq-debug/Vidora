/**
 * api/auth.js — Dedicated Serverless Authentication & Auto-Confirm Endpoint
 * Menggunakan SUPABASE_SERVICE_ROLE_KEY untuk mendaftarkan user dengan auto-confirm
 * dan mengonfirmasi email user tanpa perlu verifikasi email manual.
 */

const manageOrderHandler = require('./manage-order.js');

module.exports = async function handler(req, res) {
  // Pastikan request di-route dengan action yang sesuai jika tidak dispesifikasikan
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    if (body && !body.action) {
      if (body.password) {
        body.action = 'register_user';
      } else if (body.email) {
        body.action = 'confirm_email';
      }
      req.body = body;
    }
  }

  return manageOrderHandler(req, res);
};
