// =========================================================================
// VIDORA SaaS Client Configuration
// =========================================================================

window.VIDORA_CONFIG = {
    // Supabase URL & Anon Key (Fallback localStorage atau Vercel /api/config)
    SUPABASE_URL: localStorage.getItem("vidora_supabase_url") || "https://your-project.supabase.co",
    SUPABASE_ANON_KEY: localStorage.getItem("vidora_supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    
    // Cloudflare R2 Public Domain
    R2_PUBLIC_DOMAIN: localStorage.getItem("vidora_r2_domain") || "https://pub-your-id.r2.dev",

    // Default Limits
    MAX_GOOGLE_ACCOUNTS_DEFAULT: 5,
    
    // Super Admin Email Whitelist (Otomatis role superadmin)
    SUPERADMIN_EMAILS: ["winalislam@gmail.com"],

    // Password Login Super Admin
    ADMIN_PASSWORD: "Wakrod99$",

    // App Version
    VERSION: "1.0.0 (SaaS Mobile Edition)"
};

// Auto-sync environment variables dari Vercel Serverless Function /api/config
window.syncVercelEnv = async function() {
    try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (data.supabaseUrl && data.supabaseUrl.trim() !== "") {
                window.VIDORA_CONFIG.SUPABASE_URL = data.supabaseUrl.trim();
                localStorage.setItem("vidora_supabase_url", data.supabaseUrl.trim());
            }
            if (data.supabaseAnonKey && data.supabaseAnonKey.trim() !== "") {
                window.VIDORA_CONFIG.SUPABASE_ANON_KEY = data.supabaseAnonKey.trim();
                localStorage.setItem("vidora_supabase_key", data.supabaseAnonKey.trim());
            }
            if (data.r2PublicDomain && data.r2PublicDomain.trim() !== "") {
                window.VIDORA_CONFIG.R2_PUBLIC_DOMAIN = data.r2PublicDomain.trim();
                localStorage.setItem("vidora_r2_domain", data.r2PublicDomain.trim());
            }
            return true;
        }
    } catch (e) {
        // Fallback silently if offline or running static server
    }
    return false;
};
