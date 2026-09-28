// =========================================================================
// VIDORA — Vercel Serverless Function to bridge Environment Variables
// Exposes public SUPABASE_URL & SUPABASE_ANON_KEY safely to browser client
// =========================================================================

module.exports = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || "";

    return res.status(200).json({
        supabaseUrl,
        supabaseAnonKey,
        r2PublicDomain
    });
};
