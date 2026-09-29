/**
 * api/hermes.js — Hermes AI & Model Context Protocol (MCP) Endpoint
 * Khusus Super Admin VIDORA
 * 
 * Melayani:
 * 1. Healthcheck / Ping ke MCP Server lokal / Cloudflare Tunnel
 * 2. Daftar 6 MCP Tools VIDORA untuk Hermes AI
 * 3. Simpan & Muat konfigurasi Hermes (URL Tunnel SSE, Token, dll)
 * 4. Helper generate snippet konfigurasi Claude Desktop & Hermes CLI
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Daftar 6 MCP Tools resmi VIDORA untuk Hermes
const VIDORA_MCP_TOOLS = [
  {
    name: "vidora_generate_video",
    description: "Generate video produk AI sinematik (Omni Flash / Veo) format 9:16 vertikal, 16:9, atau 1:1.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Prompt visual sinematik dan detail produk" },
        aspect_ratio: { type: "string", enum: ["9:16", "16:9", "1:1", "4:5"], default: "9:16" },
        model: { type: "string", default: "omni-flash" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "vidora_generate_image",
    description: "Generate foto produk studio AI kualitas tinggi (Nano Banana Engine).",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Prompt deskripsi produk dan pencahayaan studio" },
        aspect_ratio: { type: "string", enum: ["1:1", "9:16", "16:9"], default: "1:1" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "vidora_generate_prompt",
    description: "Analisa foto produk via Gemini Vision untuk menyusun prompt video/gambar otomatis.",
    parameters: {
      type: "object",
      properties: {
        product_name: { type: "string", description: "Nama produk" },
        usp: { type: "string", description: "Keunggulan utama / Unique Selling Point produk" },
        category: { type: "string", description: "Kategori produk (skincare, fashion, kuliner, dll)" }
      },
      required: ["product_name"]
    }
  },
  {
    name: "vidora_list_accounts",
    description: "Melihat daftar seluruh akun Google vault yang terhubung dan siap render di VIDORA.",
    parameters: {
      type: "object",
      properties: {
        filter_status: { type: "string", enum: ["all", "ready", "limit"], default: "all" }
      }
    }
  },
  {
    name: "vidora_get_job_status",
    description: "Memeriksa status progres render (%), error log, dan link download MP4 hasil video.",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "ID job rendering VIDORA" }
      },
      required: ["job_id"]
    }
  },
  {
    name: "vidora_cleanup_storage",
    description: "Membersihkan file Cloudflare R2 yang sudah lebih dari 3 hari agar penyimpanan tetap hemat.",
    parameters: {
      type: "object",
      properties: {
        days_older: { type: "integer", default: 3 }
      }
    }
  }
];

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) {}
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const queryAction = urlObj.searchParams.get('action');

    let body = {};
    if (req.method === 'POST') {
      body = await parseBody(req);
    }

    const action = body.action || queryAction || 'get_status';

    // 1. ACTION: GET STATUS & TOOLS
    if (action === 'get_status' || action === 'tools') {
      let savedConfig = {
        mcp_tunnel_url: process.env.HERMES_MCP_URL || 'http://127.0.0.1:8000/sse',
        is_active: true,
        auth_required: false
      };

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const cfgRes = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?key=eq.hermes_config&select=value`, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          const rows = await cfgRes.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
            savedConfig = { ...savedConfig, ...rows[0].value };
          }
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        service: 'VIDORA Hermes MCP Gateway',
        version: '2.5.0',
        config: savedConfig,
        tools: VIDORA_MCP_TOOLS,
        cli_command: `hermes mcp add vidora --url "${savedConfig.mcp_tunnel_url || 'https://your-tunnel.trycloudflare.com/sse'}"`,
        mcp_json_snippet: {
          mcpServers: {
            vidora: {
              url: savedConfig.mcp_tunnel_url || 'http://127.0.0.1:8000/sse'
            }
          }
        }
      });
    }

    // 2. ACTION: PING / TEST MCP SERVER
    if (action === 'ping_mcp') {
      const testUrl = body.url || process.env.HERMES_MCP_URL || 'http://127.0.0.1:8000/sse';
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const pingRes = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Accept': 'text/event-stream, application/json, text/plain' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        const latency = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          online: pingRes.ok || pingRes.status === 200 || pingRes.status === 405 || pingRes.status === 404,
          status_code: pingRes.status,
          latency_ms: latency,
          url: testUrl,
          message: `Koneksi berhasil ke endpoint MCP (${latency}ms)`
        });
      } catch (err) {
        return res.status(200).json({
          success: false,
          online: false,
          latency_ms: Date.now() - startTime,
          url: testUrl,
          message: `Endpoint tidak merespon: ${err.message}. Pastikan start_mcp_hermes.bat sedang berjalan di PC/Server.`
        });
      }
    }

    // 3. ACTION: SAVE HERMES CONFIG
    if (action === 'save_config') {
      const newConfig = {
        mcp_tunnel_url: (body.mcp_tunnel_url || '').trim(),
        is_active: body.is_active !== false,
        auth_required: body.auth_required === true,
        updated_at: new Date().toISOString()
      };

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
              key: 'hermes_config',
              value: newConfig,
              updated_at: new Date().toISOString()
            })
          });
        } catch (dbErr) {
          console.warn('[Hermes API] DB save error:', dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Konfigurasi Hermes MCP berhasil disimpan!',
        config: newConfig
      });
    }

    return res.status(400).json({ error: 'Aksi tidak valid' });

  } catch (err) {
    console.error('[Hermes API Error]:', err);
    return res.status(500).json({ error: err.message });
  }
};
