// =========================================================================
// VIDORA Studio App Controller (Mirip 100% Workflow GAMA PRO)
// =========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    lucide.createIcons();

    // State
    let currentTab = "studio";
    let activeSubTab = "video";
    let videoRatio = "9:16";
    let videoDuration = "8s";
    let imageRatio = "9:16";
    let uploadedProductImage = null; // Base64 data URL
    let userAccounts = [];
    let userJobs = [];
    let activeProfile = null;

    // Elements - Subtabs
    const subTabBtns = document.querySelectorAll(".sub-tab-btn");
    const subviews = {
        video: document.getElementById("subview-video"),
        image: document.getElementById("subview-image"),
        promptgen: document.getElementById("subview-promptgen")
    };

    // Elements - Video Generator
    const videoDropzone = document.getElementById("videoDropzone");
    const videoFileInput = document.getElementById("videoFileInput");
    const videoPreviewBox = document.getElementById("videoPreviewBox");
    const videoPreviewImg = document.getElementById("videoPreviewImg");
    const btnRemoveVideoPreview = document.getElementById("btnRemoveVideoPreview");
    const videoPromptInput = document.getElementById("videoPromptInput");
    const videoAccountSelect = document.getElementById("videoAccountSelect");
    const btnVideoAutoPrompt = document.getElementById("btnVideoAutoPrompt");
    const btnGenerateVideo = document.getElementById("btnGenerateVideo");

    // Elements - Image Generator
    const imageDropzone = document.getElementById("imageDropzone");
    const imageFileInput = document.getElementById("imageFileInput");
    const imagePreviewBox = document.getElementById("imagePreviewBox");
    const imagePreviewImg = document.getElementById("imagePreviewImg");
    const btnRemoveImagePreview = document.getElementById("btnRemoveImagePreview");
    const imagePromptInput = document.getElementById("imagePromptInput");
    const imageAccountSelect = document.getElementById("imageAccountSelect");
    const btnImageAutoPrompt = document.getElementById("btnImageAutoPrompt");
    const btnGenerateImage = document.getElementById("btnGenerateImage");

    // Elements - Prompt Generator
    const pgDropzone = document.getElementById("pgDropzone");
    const pgFileInput = document.getElementById("pgFileInput");
    const pgPreviewBox = document.getElementById("pgPreviewBox");
    const pgPreviewImg = document.getElementById("pgPreviewImg");
    const btnRemovePgPreview = document.getElementById("btnRemovePgPreview");
    const pgModeSelect = document.getElementById("pgModeSelect");
    const pgStyleSelect = document.getElementById("pgStyleSelect");
    const pgPlatformSelect = document.getElementById("pgPlatformSelect");
    const pgExtraInput = document.getElementById("pgExtraInput");
    const btnRunPromptGen = document.getElementById("btnRunPromptGen");
    const pgResultCard = document.getElementById("pgResultCard");
    const pgResultText = document.getElementById("pgResultText");
    const btnPgCopy = document.getElementById("btnPgCopy");
    const btnPgSendToVideo = document.getElementById("btnPgSendToVideo");
    const btnPgSendToImage = document.getElementById("btnPgSendToImage");

    // Elements - Bottom Navigation & Accounts
    const tabPanes = document.querySelectorAll(".tab-pane");
    const navItems = document.querySelectorAll(".nav-item");
    const queueList = document.getElementById("queueList");
    const galleryGrid = document.getElementById("galleryGrid");
    const accountsList = document.getElementById("accountsList");
    const accountLimitText = document.getElementById("accountLimitText");
    const accountLimitFill = document.getElementById("accountLimitFill");
    const userRoleBadge = document.getElementById("userRoleBadge");

    // Modals
    const modalAddAccount = document.getElementById("modalAddAccount");
    const modalVideoPlayer = document.getElementById("modalVideoPlayer");
    const playerVideo = document.getElementById("playerVideo");
    const playerImage = document.getElementById("playerImage");
    const playerPromptText = document.getElementById("playerPromptText");
    const playerModalTitle = document.getElementById("playerModalTitle");
    const btnDownloadVideo = document.getElementById("btnDownloadVideo");

    // 1. Initial Load
    async function initApp() {
        const session = await window.vidoraData.getSession();
        activeProfile = session?.profile || { role: "user", max_google_accounts: 5 };

        if (activeProfile.role === "admin" || activeProfile.role === "superadmin") {
            userRoleBadge.innerHTML = `<i data-lucide="crown" style="width:13px;height:13px;color:#fbbf24;"></i> Super Admin (Bebas Slot)`;
            userRoleBadge.style.borderColor = "rgba(251, 191, 36, 0.4)";
            userRoleBadge.style.color = "#fef08a";
        } else {
            userRoleBadge.innerHTML = `<i data-lucide="user" style="width:13px;height:13px;"></i> Member Pro`;
        }
        lucide.createIcons();

        await refreshAccounts();
        await refreshJobs();
    }

    // 2. Sub-Tab Switching (Video / Image / Prompt Gen)
    function switchSubTab(subKey) {
        activeSubTab = subKey;
        subTabBtns.forEach(btn => {
            if (btn.getAttribute("data-sub") === subKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        Object.keys(subviews).forEach(k => {
            if (k === subKey) {
                subviews[k].style.display = "block";
            } else {
                subviews[k].style.display = "none";
            }
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    subTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const sub = btn.getAttribute("data-sub");
            if (sub) switchSubTab(sub);
        });
    });

    // 3. Bottom Tab Switching (Studio, Akun, Antrian, Galeri)
    function switchTab(tabId) {
        currentTab = tabId;
        const allPanes = document.querySelectorAll(".tab-pane");
        const allNavs = document.querySelectorAll(".nav-item");

        allPanes.forEach(pane => {
            pane.classList.remove("active");
            pane.style.display = "none";
        });
        allNavs.forEach(item => item.classList.remove("active"));

        const targetPane = document.getElementById(`tab-${tabId}`);
        const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        
        if (targetPane) {
            targetPane.classList.add("active");
            targetPane.style.display = "block";
        }
        if (targetNav) {
            targetNav.classList.add("active");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tab = item.getAttribute("data-tab");
            if (tab) switchTab(tab);
        });
    });

    // Set tab studio aktif saat pertama kali buka
    switchTab("studio");

    // 4. File Upload Handlers (Foto Produk)
    function setupFileUpload(dropzone, input, previewBox, previewImg, btnRemove) {
        dropzone.addEventListener("click", () => input.click());

        input.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                uploadedProductImage = evt.target.result;
                previewImg.src = uploadedProductImage;
                previewBox.style.display = "block";
                dropzone.style.display = "none";

                // Sync ke subview lain jika masih kosong
                if (previewBox !== videoPreviewBox && !videoPreviewImg.src) {
                    videoPreviewImg.src = uploadedProductImage;
                    videoPreviewBox.style.display = "block";
                    videoDropzone.style.display = "none";
                }
                if (previewBox !== imagePreviewBox && !imagePreviewImg.src) {
                    imagePreviewImg.src = uploadedProductImage;
                    imagePreviewBox.style.display = "block";
                    imageDropzone.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        });

        btnRemove.addEventListener("click", (e) => {
            e.stopPropagation();
            previewBox.style.display = "none";
            previewImg.src = "";
            dropzone.style.display = "block";
            input.value = "";
        });
    }

    setupFileUpload(videoDropzone, videoFileInput, videoPreviewBox, videoPreviewImg, btnRemoveVideoPreview);
    setupFileUpload(imageDropzone, imageFileInput, imagePreviewBox, imagePreviewImg, btnRemoveImagePreview);
    setupFileUpload(pgDropzone, pgFileInput, pgPreviewBox, pgPreviewImg, btnRemovePgPreview);

    // 5. Rasio & Durasi Button Toggles
    document.querySelectorAll(".video-ratio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".video-ratio-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            videoRatio = btn.getAttribute("data-ratio");
        });
    });

    document.querySelectorAll(".video-dur-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".video-dur-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            videoDuration = btn.getAttribute("data-duration");
        });
    });

    document.querySelectorAll(".image-ratio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".image-ratio-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            imageRatio = btn.getAttribute("data-ratio");
        });
    });

    // 5. Gemini API Key Management (User Memasukkan Kunci Milik Sendiri)
    const userGeminiKeyInput = document.getElementById("userGeminiKeyInput");
    const btnSaveGeminiKey = document.getElementById("btnSaveGeminiKey");
    const geminiKeyStatusBadge = document.getElementById("geminiKeyStatusBadge");
    const btnToggleShowGeminiKey = document.getElementById("btnToggleShowGeminiKey");
    const eyeIconGemini = document.getElementById("eyeIconGemini");

    function loadUserGeminiKey() {
        const savedKey = localStorage.getItem("vidora_user_gemini_key") || "";
        if (savedKey) {
            userGeminiKeyInput.value = savedKey;
            geminiKeyStatusBadge.textContent = "Aktif & Siap";
            geminiKeyStatusBadge.style.background = "rgba(16, 185, 129, 0.15)";
            geminiKeyStatusBadge.style.color = "#10b981";
        } else {
            userGeminiKeyInput.value = "";
            geminiKeyStatusBadge.textContent = "Belum Diisi";
            geminiKeyStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
            geminiKeyStatusBadge.style.color = "#f87171";
        }
    }
    loadUserGeminiKey();

    btnSaveGeminiKey.addEventListener("click", () => {
        const key = userGeminiKeyInput.value.trim();
        if (!key) {
            localStorage.removeItem("vidora_user_gemini_key");
            loadUserGeminiKey();
            alert("API Key Gemini dihapus.");
            return;
        }
        localStorage.setItem("vidora_user_gemini_key", key);
        loadUserGeminiKey();
        alert("API Key Gemini Anda berhasil disimpan secara aman di browser!");
    });

    btnToggleShowGeminiKey.addEventListener("click", () => {
        if (userGeminiKeyInput.type === "password") {
            userGeminiKeyInput.type = "text";
            eyeIconGemini.setAttribute("data-lucide", "eye-off");
        } else {
            userGeminiKeyInput.type = "password";
            eyeIconGemini.setAttribute("data-lucide", "eye");
        }
        lucide.createIcons();
    });

    function getUserGeminiKey() {
        return (localStorage.getItem("vidora_user_gemini_key") || "").trim();
    }

    // 6. Gemini Vision API Caller (Persis Logika OMNIVORA di GAMA PRO)
    async function analyzeProductImageWithGemini(base64Data, mode, style, platform, extra = "") {
        const apiKey = getUserGeminiKey();
        if (!apiKey) {
            alert("Perhatian: Anda belum memasukkan API Key Gemini!\n\nSilakan masukkan API Key Gemini Anda di tab 'Akun' terlebih dahulu agar AI bisa membaca foto produk Anda.");
            switchTab("accounts");
            userGeminiKeyInput.focus();
            return null;
        }

        // Parse MIME & Base64 Raw
        let mimeType = "image/jpeg";
        let cleanB64 = base64Data;
        if (base64Data.includes(";base64,")) {
            const parts = base64Data.split(";base64,");
            mimeType = parts[0].replace("data:", "");
            cleanB64 = parts[1];
        }

        const systemPrompt = `Kamu adalah asisten analisis gambar untuk prompt generator foto dan video AI (gaya OMNIVORA GAMA).
Lihat gambar produk terlampir dengan teliti. Ekstrak informasi visual faktual.
Catatan Tambahan Pengguna: ${extra || "Fokus pada produk utama"}.
Balas HANYA JSON valid tanpa markdown format berikut:
{
  "subject": "objek produk utama secara spesifik (misal: botol serum kaca amber dengan pipet hitam)",
  "colors": "warna dominan dan aksen (misal: emas, putih mutiara, transparan)",
  "composition": "latar belakang dan pencahayaan studio (misal: podium marmer dengan pencahayaan softbox)",
  "mood": "suasana (misal: mewah, elegan, segar, modern)",
  "summary": "1-2 kalimat deskripsi visual konkret apa yang terlihat pada gambar"
}`;

        const requestBody = {
            contents: [{
                role: "user",
                parts: [
                    { text: systemPrompt },
                    { inline_data: { mime_type: mimeType, data: cleanB64 } }
                ]
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500,
                responseMimeType: "application/json"
            }
        };

        const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
        let lastError = null;

        for (const model of models) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    throw new Error(errJson.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const parsed = JSON.parse(rawText.trim());

                if (parsed && (parsed.subject || parsed.summary)) {
                    return constructFinalPrompt(parsed, mode, style, platform);
                }
            } catch (err) {
                lastError = err;
                console.warn(`[Gemini Vision] Model ${model} gagal:`, err);
            }
        }

        throw new Error(lastError ? lastError.message : "Gagal memproses gambar dengan Gemini Vision.");
    }

    function constructFinalPrompt(analysis, mode, style, platform) {
        const subject = analysis.subject || "premium product";
        const colors = analysis.colors || "luxurious colors";
        const composition = analysis.composition || "studio lighting with soft shadows";
        const mood = analysis.mood || "elegant and modern";

        const platformGuides = {
            tiktok: "format vertikal 9:16 untuk TikTok Affiliate, hook visual memikat dalam 2 detik pertama, diakhiri ajakan membeli dengan mengarahkan ke keranjang kuning (yellow basket) di pojok kiri bawah",
            shopee: "format vertikal 9:16 untuk Shopee Video Affiliate, penonjolan detail keunggulan produk secara atraktif, diakhiri ajakan membeli dengan mengarahkan ke keranjang oranye (orange basket) Shopee",
            instagram: "format estetis 9:16 untuk Instagram Reels, color grading hangat dan mewah, diakhiri ajakan cek link di bio",
            youtube: "format sinematik 9:16 untuk YouTube Shorts, ketajaman depth of field 4k, diakhiri ajakan cek link di deskripsi",
            ads: "format iklan berbayar (Meta/TikTok Ads), pencahayaan studio tingkat tinggi, direct response call to action"
        };

        const platNote = platformGuides[platform] || platformGuides.tiktok;

        if (mode === "image") {
            return `High-end commercial product photography of ${subject}, featuring ${colors}, set against ${composition}, ${mood} aesthetic, captured on 100MP medium format camera, razor sharp focus, volumetric soft studio lighting, advertising award winner. Optimized for ${platNote}.`;
        } else {
            return `Cinematic 8k commercial video of ${subject}, showcasing ${colors}, dynamic gentle camera pan across ${composition}, ${mood} atmosphere, beautiful light flares and reflections, 60fps smooth motion blur. Optimized for ${platNote}.`;
        }
    }

    // Auto Prompt Buttons in Studio
    btnVideoAutoPrompt.addEventListener("click", async () => {
        if (!uploadedProductImage) {
            alert("Silakan upload foto produk terlebih dahulu agar Gemini bisa menganalisanya!");
            videoDropzone.click();
            return;
        }

        btnVideoAutoPrompt.disabled = true;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa...</span>`;
        lucide.createIcons();

        try {
            const prompt = await analyzeProductImageWithGemini(uploadedProductImage, "video", "cinematic", "tiktok");
            if (prompt) {
                videoPromptInput.value = prompt;
                videoPromptInput.focus();
            }
        } catch (err) {
            alert("Error Gemini Vision: " + err.message);
        } finally {
            btnVideoAutoPrompt.disabled = false;
            btnVideoAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width: 13px; height: 13px;"></i> <span>Auto Prompt dari Foto</span>`;
            lucide.createIcons();
        }
    });

    btnImageAutoPrompt.addEventListener("click", async () => {
        if (!uploadedProductImage) {
            alert("Silakan upload foto produk terlebih dahulu agar Gemini bisa menganalisanya!");
            imageDropzone.click();
            return;
        }

        btnImageAutoPrompt.disabled = true;
        btnImageAutoPrompt.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa...</span>`;
        lucide.createIcons();

        try {
            const prompt = await analyzeProductImageWithGemini(uploadedProductImage, "image", "minimalist", "instagram");
            if (prompt) {
                imagePromptInput.value = prompt;
                imagePromptInput.focus();
            }
        } catch (err) {
            alert("Error Gemini Vision: " + err.message);
        } finally {
            btnImageAutoPrompt.disabled = false;
            btnImageAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width: 13px; height: 13px;"></i> <span>Auto Prompt dari Foto</span>`;
            lucide.createIcons();
        }
    });

    // 7. Prompt Generator Panel Action (Menggunakan Gemini Vision Asli)
    btnRunPromptGen.addEventListener("click", async () => {
        const activeImg = pgPreviewImg.src || uploadedProductImage;
        if (!activeImg) {
            alert("Silakan upload foto produk terlebih dahulu di kotak atas!");
            pgDropzone.click();
            return;
        }

        const mode = pgModeSelect.value;
        const style = pgStyleSelect.value;
        const platform = pgPlatformSelect.value;
        const extra = pgExtraInput.value.trim();

        btnRunPromptGen.disabled = true;
        btnRunPromptGen.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:16px;height:16px;"></i> Gemini Sedang Menganalisa Foto...`;
        lucide.createIcons();

        try {
            const prompt = await analyzeProductImageWithGemini(activeImg, mode, style, platform, extra);
            if (prompt) {
                pgResultText.value = prompt;
                pgResultCard.style.display = "block";
                pgResultCard.scrollIntoView({ behavior: "smooth" });
            }
        } catch (err) {
            alert("Error Gemini Vision: " + err.message);
        } finally {
            btnRunPromptGen.disabled = false;
            btnRunPromptGen.innerHTML = `<i data-lucide="wand-2" style="width:18px;height:18px;"></i> <span>GENERATE PROMPT DARI GAMBAR</span>`;
            lucide.createIcons();
        }
    });

    btnPgCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(pgResultText.value);
        alert("Prompt berhasil disalin ke clipboard!");
    });

    btnPgSendToVideo.addEventListener("click", () => {
        videoPromptInput.value = pgResultText.value;
        if (pgPreviewImg.src) {
            videoPreviewImg.src = pgPreviewImg.src;
            videoPreviewBox.style.display = "block";
            videoDropzone.style.display = "none";
        }
        switchSubTab("video");
    });

    btnPgSendToImage.addEventListener("click", () => {
        imagePromptInput.value = pgResultText.value;
        if (pgPreviewImg.src) {
            imagePreviewImg.src = pgPreviewImg.src;
            imagePreviewBox.style.display = "block";
            imageDropzone.style.display = "none";
        }
        switchSubTab("image");
    });

    // 8. Generate Video Action
    btnGenerateVideo.addEventListener("click", async () => {
        const prompt = videoPromptInput.value.trim();
        if (!prompt) {
            alert("Silakan masukkan prompt video terlebih dahulu (atau gunakan tombol Auto Prompt dari foto).");
            videoPromptInput.focus();
            return;
        }

        btnGenerateVideo.disabled = true;
        btnGenerateVideo.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:18px;height:18px;"></i> Mengirim Antrian...`;
        lucide.createIcons();

        try {
            const hidden = document.getElementById("videoHiddenCheck").checked;
            const googleAccountId = videoAccountSelect.value || null;

            await window.vidoraData.createGenerateJob({
                prompt,
                model: "Omni Flash",
                ratio: videoRatio,
                duration: videoDuration,
                count: 1,
                googleAccountId,
                hidden
            });

            videoPromptInput.value = "";
            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="play" style="width: 18px; height: 18px;"></i> <span>GENERATE VIDEO AI</span>`;
            lucide.createIcons();

            switchTab("queue");
            await refreshJobs();
        } catch (err) {
            alert("Gagal memproses antrian: " + err.message);
            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="play" style="width: 18px; height: 18px;"></i> <span>GENERATE VIDEO AI</span>`;
            lucide.createIcons();
        }
    });

    // 9. Generate Image Action
    btnGenerateImage.addEventListener("click", async () => {
        const prompt = imagePromptInput.value.trim();
        if (!prompt) {
            alert("Silakan masukkan prompt gambar terlebih dahulu.");
            imagePromptInput.focus();
            return;
        }

        btnGenerateImage.disabled = true;
        btnGenerateImage.innerHTML = `<i data-lucide="loader-2" class="spin" style="width:18px;height:18px;"></i> Mengirim Antrian...`;
        lucide.createIcons();

        try {
            const hidden = document.getElementById("imageHiddenCheck").checked;
            const googleAccountId = imageAccountSelect.value || null;

            await window.vidoraData.createGenerateJob({
                prompt,
                model: "Nano Banana",
                ratio: imageRatio,
                duration: "photo",
                count: 1,
                googleAccountId,
                hidden
            });

            imagePromptInput.value = "";
            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="camera" style="width: 18px; height: 18px;"></i> <span>GENERATE GAMBAR AI</span>`;
            lucide.createIcons();

            switchTab("queue");
            await refreshJobs();
        } catch (err) {
            alert("Gagal memproses antrian: " + err.message);
            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="camera" style="width: 18px; height: 18px;"></i> <span>GENERATE GAMBAR AI</span>`;
            lucide.createIcons();
        }
    });

    // 10. Account Management
    async function refreshAccounts() {
        userAccounts = await window.vidoraData.getGoogleAccounts();

        // Populate dropdowns
        [videoAccountSelect, imageAccountSelect].forEach(sel => {
            sel.innerHTML = `<option value="">-- Rotasi Otomatis Semua Akun Aktif --</option>`;
            userAccounts.forEach(acc => {
                const opt = document.createElement("option");
                opt.value = acc.id;
                opt.textContent = `${acc.email} (${acc.label || 'Akun'}) [${acc.credit_status.toUpperCase()}]`;
                sel.appendChild(opt);
            });
        });

        // Limit calculation
        const maxLimit = activeProfile?.role === "superadmin" ? 9999 : (activeProfile?.max_google_accounts || 5);
        if (activeProfile?.role === "superadmin") {
            accountLimitText.textContent = `${userAccounts.length} Akun (Unlimited Slot)`;
            accountLimitFill.style.width = "100%";
        } else {
            accountLimitText.textContent = `${userAccounts.length} / ${maxLimit} Slot Terpakai`;
            const pct = Math.min(100, (userAccounts.length / maxLimit) * 100);
            accountLimitFill.style.width = `${pct}%`;
        }

        // Render List Akun
        accountsList.innerHTML = "";
        if (userAccounts.length === 0) {
            accountsList.innerHTML = `
                <div style="text-align: center; padding: 26px; color: var(--text-tertiary);">
                    <i data-lucide="user-x" style="width: 30px; height: 30px; margin-bottom: 6px;"></i>
                    <p>Belum ada akun Google terhubung.</p>
                </div>
            `;
        } else {
            userAccounts.forEach(acc => {
                const item = document.createElement("div");
                item.className = "account-item";
                item.innerHTML = `
                    <div class="account-info">
                        <div class="account-avatar">${acc.email.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="account-email">${acc.email}</div>
                            <div class="account-status">
                                <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                                <span>${acc.label || 'Google Vault'} • ${acc.credit_status}</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn-icon btn-delete-account" data-id="${acc.id}" title="Hapus Akun">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px; color: #f43f5e;"></i>
                    </button>
                `;
                accountsList.appendChild(item);
            });

            document.querySelectorAll(".btn-delete-account").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    if (confirm("Hapus akun ini dari sistem VIDORA?")) {
                        await window.vidoraData.deleteGoogleAccount(id);
                        await refreshAccounts();
                    }
                });
            });
        }
        lucide.createIcons();
    }

    // Modal Add Account
    document.getElementById("btnOpenAddAccount").addEventListener("click", () => {
        modalAddAccount.classList.add("open");
    });

    document.getElementById("btnCloseAddAccount").addEventListener("click", () => {
        modalAddAccount.classList.remove("open");
    });

    document.getElementById("formAddAccount").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("newAccountEmail").value.trim();
        const label = document.getElementById("newAccountLabel").value.trim();

        try {
            await window.vidoraData.addGoogleAccount(email, label);
            modalAddAccount.classList.remove("open");
            document.getElementById("newAccountEmail").value = "";
            document.getElementById("newAccountLabel").value = "";
            await refreshAccounts();
            alert(`Akun ${email} berhasil didaftarkan!`);
        } catch (err) {
            alert(err.message || "Gagal mendaftarkan akun.");
        }
    });

    // 11. Refresh Jobs (Antrian & Galeri)
    async function refreshJobs() {
        userJobs = await window.vidoraData.getJobs();

        // Render Antrian
        queueList.innerHTML = "";
        const pendingJobs = userJobs.filter(j => j.status !== "completed");
        if (pendingJobs.length === 0) {
            queueList.innerHTML = `
                <div style="text-align: center; padding: 28px; color: var(--text-tertiary);">
                    <i data-lucide="check-circle-2" style="width: 30px; height: 30px; margin-bottom: 6px; color: #10b981;"></i>
                    <p>Semua antrian tugas telah selesai diproses.</p>
                </div>
            `;
        } else {
            pendingJobs.forEach(job => {
                const item = document.createElement("div");
                item.className = "account-item";
                item.style.flexDirection = "column";
                item.style.alignItems = "stretch";
                item.style.gap = "6px";
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-size: 13px; font-weight: 600; max-width: 82%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            "${job.prompt}"
                        </div>
                        <span style="font-size: 12px; font-weight: 700; color: #818cf8;">${job.progress || 0}%</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">
                        Format: <strong>${job.ratio}</strong>
                    </div>
                    <div class="limit-progress-bar" style="margin: 4px 0;">
                        <div class="limit-fill" style="width: ${job.progress || 10}%;"></div>
                    </div>
                    <div style="font-size: 11px; color: #a5b4fc; display: flex; align-items: center; gap: 4px;">
                        <i data-lucide="activity" style="width: 12px; height: 12px;"></i>
                        <span>${job.status_message || 'Sedang diproses...'}</span>
                    </div>
                `;
                queueList.appendChild(item);
            });
        }

        // Render Galeri
        galleryGrid.innerHTML = "";
        const completedJobs = userJobs.filter(j => j.status === "completed" && (j.video_url || j.thumbnail_url));
        if (completedJobs.length === 0) {
            galleryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-tertiary);">
                    <i data-lucide="film" style="width: 34px; height: 34px; margin-bottom: 8px;"></i>
                    <p>Belum ada media yang selesai digenerate.</p>
                </div>
            `;
        } else {
            completedJobs.forEach(job => {
                const card = document.createElement("div");
                card.className = "video-card";
                const isImg = job.duration === "photo" || !job.video_url;
                
                card.innerHTML = `
                    ${isImg 
                        ? `<img class="video-thumb" src="${job.thumbnail_url || job.video_url}" alt="Hasil Gambar">`
                        : `<video class="video-thumb" src="${job.video_url}" preload="metadata" muted playsinline></video>`
                    }
                    <div class="video-overlay">
                        <div class="video-prompt">${job.prompt}</div>
                    </div>
                `;
                card.addEventListener("click", () => openMediaModal(job));
                galleryGrid.appendChild(card);
            });
        }
        lucide.createIcons();
    }

    // 12. Media Player Modal
    function openMediaModal(job) {
        playerPromptText.textContent = job.prompt;
        const isImg = job.duration === "photo" || !job.video_url;

        if (isImg) {
            playerModalTitle.textContent = "Pratinjau Gambar AI";
            playerVideo.style.display = "none";
            playerImage.style.display = "block";
            playerImage.src = job.thumbnail_url || job.video_url;
            btnDownloadVideo.onclick = () => {
                window.open(job.thumbnail_url || job.video_url, "_blank");
            };
        } else {
            playerModalTitle.textContent = "Pratinjau Video AI";
            playerImage.style.display = "none";
            playerVideo.style.display = "block";
            playerVideo.src = job.video_url;
            playerVideo.play();
            btnDownloadVideo.onclick = () => {
                window.open(job.video_url, "_blank");
            };
        }
        modalVideoPlayer.classList.add("open");
    }

    document.getElementById("btnClosePlayer").addEventListener("click", () => {
        playerVideo.pause();
        playerVideo.src = "";
        playerImage.src = "";
        modalVideoPlayer.classList.remove("open");
    });

    window.vidoraData.subscribeJobs(() => {
        refreshJobs();
    });

    await initApp();
});
