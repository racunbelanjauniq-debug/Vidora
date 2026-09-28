// =========================================================================
// VIDORA SaaS Client Configuration
// =========================================================================

window.VIDORA_CONFIG = {
    // Ganti dengan URL dan Anon Key project Supabase Anda
    SUPABASE_URL: localStorage.getItem("vidora_supabase_url") || "https://your-project.supabase.co",
    SUPABASE_ANON_KEY: localStorage.getItem("vidora_supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    
    // Cloudflare R2 Public Domain (untuk direct streaming video)
    R2_PUBLIC_DOMAIN: localStorage.getItem("vidora_r2_domain") || "https://pub-your-id.r2.dev",

    // Default Limits
    MAX_GOOGLE_ACCOUNTS_DEFAULT: 5,
    
    // App Version
    VERSION: "1.0.0 (SaaS Mobile Edition)"
};
