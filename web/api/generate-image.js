// =========================================================================
// VIDORA — Serverless Image Generation Endpoint (Google Imagen 3 & Multi-Engine)
// Mendukung Google Imagen 3 (Studio Ultra-HD) dengan Google AI Studio API Key
// =========================================================================

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch (_) {}
        }
        body = body || {};

        const prompt = (body.prompt || "").trim();
        const ratio = (body.ratio || "9:16").trim();
        const style = (body.style || "studio").trim();
        const userKey = (body.apiKey || req.headers["x-gemini-key"] || "").trim();
        const targetApiKey = userKey || process.env.GEMINI_API_KEY || "";

        if (!prompt) {
            return res.status(400).json({ error: "Prompt gambar wajib diisi." });
        }

        // 1. Jika API Key Gemini/Google tersedia, coba panggil Google Imagen 3
        if (targetApiKey) {
            try {
                // Map Aspect Ratio ke format Imagen 3
                let imagenRatio = "9:16";
                if (ratio === "1:1") imagenRatio = "1:1";
                else if (ratio === "16:9") imagenRatio = "16:9";
                else if (ratio === "4:3") imagenRatio = "4:3";
                else if (ratio === "3:4") imagenRatio = "3:4";

                const enhancedPrompt = `${prompt}, commercial ${style} photography, 8k uhd, photorealistic, sharp focus, professional studio lighting, masterpiece`;

                const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(targetApiKey)}`;
                const response = await fetch(imagenUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        instances: [
                            { prompt: enhancedPrompt }
                        ],
                        parameters: {
                            sampleCount: 1,
                            aspectRatio: imagenRatio,
                            personGeneration: "ALLOW_ADULT",
                            safetySetting: "block_only_high"
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const prediction = data.predictions?.[0];
                    if (prediction && prediction.bytesBase64Encoded) {
                        const mimeType = prediction.mimeType || "image/jpeg";
                        const dataUrl = `data:${mimeType};base64,${prediction.bytesBase64Encoded}`;
                        return res.status(200).json({
                            success: true,
                            engine: "Google Imagen 3 (Studio Ultra-HD)",
                            url: dataUrl
                        });
                    }
                } else {
                    const errJson = await response.json().catch(() => ({}));
                    console.warn("[Imagen 3 API Response Error]:", response.status, errJson);
                }
            } catch (err) {
                console.warn("[Imagen 3 Execution Error]:", err.message);
            }
        }

        // 2. Fallback: Kembalikan instruksi ke client untuk menggunakan FLUX.1 Realism
        return res.status(200).json({
            success: false,
            fallback: true,
            message: "Google Imagen 3 tidak tersedia untuk key ini, beralih ke FLUX.1 Realism."
        });
    } catch (err) {
        console.error("[generate-image fatal error]:", err);
        return res.status(500).json({ error: err.message });
    }
};
