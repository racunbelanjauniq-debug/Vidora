// =========================================================================
// VIDORA — Serverless Image Generation Endpoint
// Engine: Hugging Face Serverless (FLUX.1-schnell & Realistic Vision) + Google Gemini
// Menghasilkan foto 100% fotorealistis manusia asli, tekstur kulit nyata, tanpa watermark
// =========================================================================

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-hf-token, x-gemini-key");

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
        const style = (body.style || "katalog").trim();
        const userHfToken = (body.hfToken || req.headers["x-hf-token"] || "").trim();
        const targetHfToken = userHfToken || process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || "";
        const userGeminiKey = (body.apiKey || req.headers["x-gemini-key"] || "").trim();
        const targetGeminiKey = userGeminiKey || process.env.GEMINI_API_KEY || "";

        if (!prompt) {
            return res.status(400).json({ error: "Prompt gambar wajib diisi." });
        }

        // Resolusi berdasarkan aspek rasio
        let width = 768;
        let height = 1344;
        if (ratio === "1:1") {
            width = 1024;
            height = 1024;
        } else if (ratio === "16:9") {
            width = 1344;
            height = 768;
        } else if (ratio === "4:3") {
            width = 1152;
            height = 864;
        }

        // 1. PRIORITAS UTAMA: Hugging Face Serverless (FLUX.1-schnell & Realistic Vision)
        if (targetHfToken) {
            const candidateModels = [
                "black-forest-labs/FLUX.1-schnell",
                "stabilityai/stable-diffusion-xl-base-1.0",
                "SG161222/Realistic_Vision_V5.1_noVAE"
            ];

            for (const model of candidateModels) {
                try {
                    const hfUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
                    const response = await fetch(hfUrl, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${targetHfToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: {
                                width: width,
                                height: height
                            }
                        })
                    });

                    if (response.ok) {
                        const contentType = response.headers.get("content-type") || "image/jpeg";
                        const buffer = Buffer.from(await response.arrayBuffer());
                        if (buffer.length > 500) {
                            const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
                            const modelLabel = model.split("/").pop();
                            return res.status(200).json({
                                success: true,
                                engine: `FLUX.1 Ultra-HD (${modelLabel})`,
                                url: dataUrl
                            });
                        }
                    } else {
                        const errText = await response.text().catch(() => "");
                        console.warn(`[HF Model ${model} status ${response.status}]:`, errText.slice(0, 160));
                    }
                } catch (hfErr) {
                    console.warn(`[HF Model ${model} error]:`, hfErr.message);
                }
            }
        }

        // 2. ALTERNATIF: Google Gemini Flash Image / Imagen
        if (targetGeminiKey) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(targetGeminiKey)}`;
                const gRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseModalities: ["IMAGE"],
                            imageConfig: { aspectRatio: ratio }
                        }
                    })
                });

                if (gRes.ok) {
                    const gData = await gRes.json();
                    const part = gData.candidates?.[0]?.content?.parts?.[0];
                    if (part?.inlineData?.data) {
                        const mime = part.inlineData.mimeType || "image/jpeg";
                        return res.status(200).json({
                            success: true,
                            engine: "Google Gemini Image (Ultra HD)",
                            url: `data:${mime};base64,${part.inlineData.data}`
                        });
                    }
                }
            } catch (gErr) {
                console.warn("[Gemini Image API Error]:", gErr.message);
            }
        }

        // 3. Jika token belum ada, kirim status instruksi ke client
        return res.status(200).json({
            success: false,
            needsToken: true,
            message: "Hugging Face Access Token diperlukan untuk render foto fotorealistis FLUX.1 tanpa watermark."
        });
    } catch (err) {
        console.error("[generate-image fatal error]:", err);
        return res.status(500).json({ error: err.message });
    }
};
