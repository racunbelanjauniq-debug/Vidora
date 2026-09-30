// =========================================================================
// VIDORA Studio App Controller (SaaS Architecture)
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
    let currentUser = null;

    // Checkout State
    let selectedPlan = "pro";
    let selectedPlanPrice = 99000;
    let selectedPaymentMethod = "qris";

    // Elements - Subtabs (Studio)
    const subTabBtns = document.querySelectorAll(".sub-tab-btn");
    const subviews = {
        video: document.getElementById("subview-video"),
        image: document.getElementById("subview-image"),
        promptgen: document.getElementById("subview-promptgen"),
        mixer: document.getElementById("subview-mixer")
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

    // Elements - Storyboard 3-Scene & Hybrid Mode
    const videoApStyleSelect = document.getElementById("videoApStyleSelect");
    const wrapSinglePrompt = document.getElementById("wrapSinglePrompt");
    const wrapStoryboardPrompt = document.getElementById("wrapStoryboardPrompt");
    const btnStoryboardAutoPrompt = document.getElementById("btnStoryboardAutoPrompt");
    const sbScene1 = document.getElementById("sbScene1");
    const sbScene2 = document.getElementById("sbScene2");
    const sbScene3 = document.getElementById("sbScene3");
    const sbSeoBox = document.getElementById("sbSeoBox");
    const sbSeoText = document.getElementById("sbSeoText");
    const btnCopySbSeo = document.getElementById("btnCopySbSeo");

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

    // Elements - Navigation & Badges
    const queueList = document.getElementById("queueList");
    const galleryGrid = document.getElementById("galleryGrid");
    const accountsList = document.getElementById("accountsList");
    const accountLimitText = document.getElementById("accountLimitText");
    const accountLimitFill = document.getElementById("accountLimitFill");
    const userRoleBadge = document.getElementById("userRoleBadge");
    const userRoleText = document.getElementById("userRoleText");
    const btnHeaderUpgrade = document.getElementById("btnHeaderUpgrade");
    const btnHeaderAuth = document.getElementById("btnHeaderAuth");
    const navItemAdmin = document.getElementById("navItemAdmin");

    // Modals & Banners
    const modalAddAccount = document.getElementById("modalAddAccount");
    const modalVideoPlayer = document.getElementById("modalVideoPlayer");
    const modalAuth = document.getElementById("modalAuth");
    const modalUserProfile = document.getElementById("modalUserProfile");
    const modalCheckout = document.getElementById("modalCheckout");
    const modalSubscriptionRequired = document.getElementById("modalSubscriptionRequired");
    const subWarningBanner = document.getElementById("subWarningBanner");
    const btnBannerUpgrade = document.getElementById("btnBannerUpgrade");
    const btnCloseSubRequired = document.getElementById("btnCloseSubRequired");
    const btnSubRequiredDismiss = document.getElementById("btnSubRequiredDismiss");
    const btnSubRequiredCheckout = document.getElementById("btnSubRequiredCheckout");
    const subRequiredActionDesc = document.getElementById("subRequiredActionDesc");
    const playerVideo = document.getElementById("playerVideo");
    const playerImage = document.getElementById("playerImage");
    const playerPromptText = document.getElementById("playerPromptText");
    const playerModalTitle = document.getElementById("playerModalTitle");
    const btnDownloadVideo = document.getElementById("btnDownloadVideo");

    // =========================================================================
    // Subscription Gate Helpers
    // =========================================================================
    function isUserSubscribed() {
        if (!currentUser) return false;
        if (activeProfile?.role === "superadmin" || activeProfile?.role === "admin") return true;
        if (currentUser.email === "winalislam@gmail.com") return true;
        return activeProfile?.is_subscribed === true;
    }

    function openSubscriptionRequiredModal(actionName = "") {
        if (subRequiredActionDesc && actionName) {
            subRequiredActionDesc.textContent = `Fitur "${actionName}" Terkunci — Perlu Langganan`;
        }
        if (modalSubscriptionRequired) {
            modalSubscriptionRequired.classList.add("open");
        }
    }

    function closeSubscriptionRequiredModal() {
        if (modalSubscriptionRequired) {
            modalSubscriptionRequired.classList.remove("open");
        }
    }

    function checkSubscriptionAccess(actionName = "generate") {
        if (!isUserSubscribed()) {
            openSubscriptionRequiredModal(actionName);
            return false;
        }
        return true;
    }

    // =========================================================================
    // 1. Initial Load & Auth Sync
    // =========================================================================
    async function initApp() {
        if (window.syncVercelEnv) {
            await window.syncVercelEnv();
        }
        
        let session = null;
        try {
            session = await window.vidoraData.getSession();
        } catch (e) {
            console.warn("Session check fallback:", e);
        }

        currentUser = session?.user || null;
        activeProfile = session?.profile || null;

        // TIDAK ADA MODE TAMU SAMA SEKALI: Pengunjung yang belum login langsung dialihkan ke Halaman Login
        if (!currentUser) {
            window.location.replace("/login");
            return;
        }

        const btnCloseAuth = document.getElementById("btnCloseAuth");

        // Proteksi Tab Admin -> Alihkan langsung ke Dedicated Super Admin Portal
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("tab") === "admin") {
            if (activeProfile?.role === "superadmin" || activeProfile?.role === "admin") {
                window.location.replace("/admin");
                return;
            } else {
                alert("Akses Terbatas: Hanya Super Admin yang dapat mengakses panel ini.");
                window.location.replace("/admin/login");
                return;
            }
        }

        updateHeaderUI();
        
        try {
            await refreshAccounts();
        } catch (e) {
            console.warn("refreshAccounts fallback:", e);
        }
        
        try {
            await refreshJobs();
        } catch (e) {
            console.warn("refreshJobs fallback:", e);
        }

        // Non-Member notification & banner
        const isSub = isUserSubscribed();
        if (subWarningBanner) {
            subWarningBanner.style.display = isSub ? "none" : "flex";
        }

        // Check connection pill in admin tab
        updateConnectionStatusPill();

        // Sinkronkan API Key Gemini antar perangkat (HP <-> PC)
        try {
            await loadUserGeminiKey();
        } catch (gkErr) {
            console.warn("loadUserGeminiKey error:", gkErr);
        }
    }

    function updateHeaderUI() {
        if (btnHeaderAuth) btnHeaderAuth.style.display = "none";
        if (userRoleBadge) {
            userRoleBadge.style.display = "inline-flex";

            if (activeProfile?.role === "admin" || activeProfile?.role === "superadmin") {
                userRoleBadge.innerHTML = `<i data-lucide="crown" style="width:13px;height:13px;color:#fbbf24;"></i> <span id="userRoleText">Super Admin</span>`;
                userRoleBadge.style.borderColor = "rgba(251, 191, 36, 0.4)";
                userRoleBadge.style.color = "#fef08a";
                userRoleBadge.style.background = "rgba(251, 191, 36, 0.15)";
                userRoleBadge.style.cursor = "pointer";
                userRoleBadge.title = "Buka Portal Super Admin";
                userRoleBadge.onclick = () => { window.location.href = "/admin"; };
                if (navItemAdmin) navItemAdmin.style.display = "flex";
                if (navItemAdmin) {
                    navItemAdmin.onclick = (e) => {
                        e.preventDefault();
                        window.location.href = "/admin";
                    };
                }
            } else if (isUserSubscribed()) {
                userRoleBadge.innerHTML = `<i data-lucide="check-circle" style="width:13px;height:13px;color:#10b981;"></i> <span id="userRoleText">${activeProfile?.full_name || 'Member'} (Aktif)</span>`;
                userRoleBadge.style.borderColor = "rgba(16, 185, 129, 0.35)";
                userRoleBadge.style.color = "#a7f3d0";
                userRoleBadge.style.background = "rgba(16, 185, 129, 0.12)";
                userRoleBadge.onclick = null;
                if (navItemAdmin) navItemAdmin.style.display = "none";
            } else {
                userRoleBadge.innerHTML = `<i data-lucide="user-check" style="width:13px;height:13px;color:#60a5fa;"></i> <span id="userRoleText">${activeProfile?.full_name || 'Member'}</span>`;
                userRoleBadge.style.borderColor = "rgba(96, 165, 250, 0.4)";
                userRoleBadge.style.color = "#93c5fd";
                userRoleBadge.style.background = "rgba(96, 165, 250, 0.12)";
                userRoleBadge.onclick = null;
                if (navItemAdmin) navItemAdmin.style.display = "none";
            }
        }
        if (window.lucide && typeof lucide.createIcons === "function") {
            lucide.createIcons();
        }
    }

    function updateConnectionStatusPill() {
        const pill = document.getElementById("adminConnectionPill");
        const text = document.getElementById("adminConnectionText");
        const dot = pill?.querySelector(".status-dot");
        if (!pill || !text) return;

        if (window.vidoraData.isLive) {
            pill.className = "connection-status-pill connected";
            text.textContent = "Supabase Live";
            if (dot) dot.className = "status-dot green";
        } else {
            pill.className = "connection-status-pill disconnected";
            text.textContent = "Demo / Offline";
            if (dot) dot.className = "status-dot red";
        }
    }

    // =========================================================================
    // 2. Navigation & Tabs
    // =========================================================================
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

        if (tabId === "admin") {
            renderAdminDashboard();
        }
        if (tabId === "accounts") {
            loadUserGeminiKey();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tab = item.getAttribute("data-tab");
            if (tab) switchTab(tab);
        });
    });

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

    // Default tab
    switchTab("studio");

    // =========================================================================
    // 3. User Authentication & Profile Modal
    // =========================================================================
    if (btnHeaderAuth) {
        btnHeaderAuth.addEventListener("click", () => {
            window.location.href = "login";
        });
    }

    userRoleBadge.addEventListener("click", () => {
        if (!currentUser || currentUser.id === "guest") {
            window.location.href = "login";
            return;
        }
        // Fill profile modal
        document.getElementById("userProfileInitial").textContent = (activeProfile.full_name || currentUser.email || "U")[0].toUpperCase();
        document.getElementById("userProfileName").textContent = activeProfile.full_name || "Pengguna VIDORA";
        document.getElementById("userProfileEmail").textContent = currentUser.email || "-";
        
        const badgeElem = document.getElementById("userProfileRoleBadge");
        const limitElem = document.getElementById("userProfileLimitText");
        const subStatusElem = document.getElementById("userProfileSubStatus");
        const btnToggleSubQuick = document.getElementById("btnToggleSubQuick");
        const isSub = isUserSubscribed();

        if (activeProfile.role === "superadmin") {
            badgeElem.className = "role-badge-admin";
            badgeElem.textContent = "Super Admin";
            limitElem.textContent = "Unlimited Akun";
        } else {
            badgeElem.className = "role-badge-user";
            badgeElem.textContent = isSub ? "Member (Creator Pass)" : "Non-Member";
            limitElem.textContent = `Maks ${activeProfile.max_google_accounts || 5} Akun`;
        }

        if (subStatusElem) {
            subStatusElem.textContent = isSub ? "Aktif (Creator Pass)" : "Belum Berlangganan";
            subStatusElem.style.color = isSub ? "#10b981" : "#f59e0b";
        }

        if (btnToggleSubQuick) {
            btnToggleSubQuick.textContent = isSub ? "Tes Non-Member" : "Tes Member Aktif";
        }

        modalUserProfile.classList.add("open");
    });

    document.getElementById("btnCloseProfileModal").addEventListener("click", () => {
        modalUserProfile.classList.remove("open");
    });

    document.getElementById("btnCloseAuth").addEventListener("click", () => {
        modalAuth.classList.remove("open");
    });

    // Subscription required modal buttons
    if (btnCloseSubRequired) {
        btnCloseSubRequired.addEventListener("click", closeSubscriptionRequiredModal);
    }
    if (btnSubRequiredDismiss) {
        btnSubRequiredDismiss.addEventListener("click", closeSubscriptionRequiredModal);
    }
    if (btnSubRequiredCheckout) {
        btnSubRequiredCheckout.addEventListener("click", () => {
            closeSubscriptionRequiredModal();
            openCheckoutModal();
        });
    }
    if (btnBannerUpgrade) {
        btnBannerUpgrade.addEventListener("click", () => {
            openCheckoutModal();
        });
    }

    // Toggle Role Quick in Demo
    document.getElementById("btnToggleRoleQuick").addEventListener("click", () => {
        activeProfile = window.vidoraData.toggleDemoRole();
        updateHeaderUI();
        modalUserProfile.classList.remove("open");
        alert(`Peran berhasil diubah menjadi: ${activeProfile.role === 'superadmin' ? '👑 Super Admin (Bebas Slot)' : '👤 Member Pro (Maks 5 Akun)'}`);
        if (activeProfile.role === "superadmin") {
            switchTab("admin");
        } else {
            switchTab("studio");
        }
    });

    // Toggle Subscription Status Quick in Demo/Testing
    const btnToggleSubQuick = document.getElementById("btnToggleSubQuick");
    if (btnToggleSubQuick) {
        btnToggleSubQuick.addEventListener("click", () => {
            const nextSub = window.vidoraData.toggleDemoSubscription();
            if (activeProfile) activeProfile.is_subscribed = nextSub;
            updateHeaderUI();
            if (subWarningBanner) {
                subWarningBanner.style.display = nextSub ? "none" : "flex";
            }
            modalUserProfile.classList.remove("open");
            alert(`Status Langganan berhasil diubah: ${nextSub ? '✅ Aktif (Creator Pass)' : '⚠️ Belum Berlangganan (Non-Member)'}`);
            if (!nextSub) {
                openSubscriptionRequiredModal("Akses Studio AI Generator");
            }
        });
    }

    // Auth Tabs
    const btnTabSignIn = document.getElementById("btnTabSignIn");
    const btnTabSignUp = document.getElementById("btnTabSignUp");
    const formSignIn = document.getElementById("formSignIn");
    const formSignUp = document.getElementById("formSignUp");

    btnTabSignIn.addEventListener("click", () => {
        btnTabSignIn.classList.add("active");
        btnTabSignUp.classList.remove("active");
        formSignIn.style.display = "block";
        formSignUp.style.display = "none";
    });

    btnTabSignUp.addEventListener("click", () => {
        btnTabSignUp.classList.add("active");
        btnTabSignIn.classList.remove("active");
        formSignUp.style.display = "block";
        formSignIn.style.display = "none";
    });

    // Form Sign In Submit
    formSignIn.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("signInEmail").value.trim();
        const password = document.getElementById("signInPassword").value;
        const errElem = document.getElementById("authSignInError");
        errElem.style.display = "none";

        try {
            await window.vidoraData.signIn(email, password);
            modalAuth.classList.remove("open");
            await initApp();
            alert("Berhasil masuk ke VIDORA Studio!");
        } catch (err) {
            errElem.textContent = err.message || "Gagal masuk, periksa email & password.";
            errElem.style.display = "block";
        }
    });

    // Form Sign Up Submit
    formSignUp.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("signUpName").value.trim();
        const email = document.getElementById("signUpEmail").value.trim();
        const password = document.getElementById("signUpPassword").value;
        const errElem = document.getElementById("authSignUpError");
        errElem.style.display = "none";

        try {
            await window.vidoraData.signUp(email, password, name);
            modalAuth.classList.remove("open");
            await initApp();
            alert("Pendaftaran berhasil! Akun Anda siap digunakan.");
        } catch (err) {
            errElem.textContent = err.message || "Gagal mendaftar, coba email lain.";
            errElem.style.display = "block";
        }
    });

    // (Guest mode removed — strictly require account login)


    // Sign Out -> Redirect ke halaman Login
    document.getElementById("btnSignOut").addEventListener("click", async () => {
        if (confirm("Apakah Anda yakin ingin keluar dari VIDORA Studio?")) {
            await window.vidoraData.signOut();
            window.location.replace("login");
        }
    });

    // =========================================================================
    // 4. Form Checkout (CO) & Upgrade Subscription Modal
    // =========================================================================
    function openCheckoutModal() {
        selectedPlan = "creator";
        selectedPlanPrice = 75000;
        
        const qrisAmountText = document.getElementById("qrisAmountText");
        const submitBtnText = document.getElementById("btnSubmitCheckoutText");
        if (qrisAmountText) qrisAmountText.textContent = "Total: Rp 75.000";
        if (submitBtnText) submitBtnText.textContent = "Bayar Sekarang (Rp 75.000)";

        modalUserProfile.classList.remove("open");
        modalCheckout.classList.add("open");

        // Prefill name & email if logged in (not guest)
        if (currentUser && currentUser.id !== "guest") {
            document.getElementById("coCustomerName").value = activeProfile?.full_name || "";
            document.getElementById("coCustomerEmail").value = currentUser.email || "";
        } else {
            document.getElementById("coCustomerName").value = "";
            document.getElementById("coCustomerEmail").value = "";
        }

        // Sync Rekening Bank Dinamis dari Pengaturan Super Admin
        syncCheckoutBankInfo();
    }

    // Fungsi Sync Rekening Bank Checkout Dinamis
    function syncCheckoutBankInfo() {
        const bcaNum = localStorage.getItem("cfg_bca_number") || "8012 3456 7890";
        const bcaName = localStorage.getItem("cfg_bca_name") || "VIDORA OFFICIAL";
        const numEl = document.getElementById("bankNumberBca");
        const nameEl = document.getElementById("bankNameBca");
        if (numEl) numEl.textContent = bcaNum;
        if (nameEl) nameEl.textContent = "a.n " + bcaName;

        fetch("/api/settings", { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.settings) {
                    if (data.settings.cfg_bca_number) {
                        localStorage.setItem("cfg_bca_number", data.settings.cfg_bca_number);
                        if (numEl) numEl.textContent = data.settings.cfg_bca_number;
                    }
                    if (data.settings.cfg_bca_name) {
                        localStorage.setItem("cfg_bca_name", data.settings.cfg_bca_name);
                        if (nameEl) nameEl.textContent = "a.n " + data.settings.cfg_bca_name;
                    }
                }
            })
            .catch(() => {});
    }

    document.getElementById("btnCopyBankBca")?.addEventListener("click", () => {
        const num = (document.getElementById("bankNumberBca")?.textContent || "").replace(/\s+/g, "");
        if (num) {
            navigator.clipboard.writeText(num);
            alert(`Nomor Rekening BCA (${num}) berhasil disalin!`);
        }
    });

    btnHeaderUpgrade.addEventListener("click", () => openCheckoutModal());
    document.getElementById("btnProfileUpgrade").addEventListener("click", () => openCheckoutModal());
    document.getElementById("btnCloseCheckout").addEventListener("click", () => modalCheckout.classList.remove("open"));

    // Payment methods toggle
    const payMethodItems = document.querySelectorAll(".payment-method-item");
    const payViewQris = document.getElementById("payViewQris");
    const payViewBank = document.getElementById("payViewBank");
    const payViewWhatsapp = document.getElementById("payViewWhatsapp");

    payMethodItems.forEach(item => {
        item.addEventListener("click", () => {
            payMethodItems.forEach(p => p.classList.remove("active"));
            item.classList.add("active");
            selectedPaymentMethod = item.getAttribute("data-paymethod");

            payViewQris.style.display = selectedPaymentMethod === "qris" ? "flex" : "none";
            payViewBank.style.display = selectedPaymentMethod === "bank" ? "block" : "none";
            payViewWhatsapp.style.display = selectedPaymentMethod === "whatsapp" ? "block" : "none";
        });
    });

    // Checkout form submit
    document.getElementById("formCheckoutOrder").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("coCustomerName").value.trim();
        const phone = document.getElementById("coCustomerPhone").value.trim();
        const email = document.getElementById("coCustomerEmail").value.trim();

        const planTitle = "VIDORA Creator Pass (5 Profil)";
        const planPrice = 75000;

        try {
            const order = await window.vidoraData.createOrder({
                plan: planTitle,
                price: planPrice,
                name,
                phone,
                email,
                method: selectedPaymentMethod.toUpperCase()
            });

            // Trigger automatic WhatsApp notification via xsender.id
            if (window.xsender) {
                window.xsender.notifyOrderPlaced(order).catch(err => console.warn("[Xsender] Gagal kirim notif order:", err));
            }

            // Jika QRIS dipilih, alihkan langsung ke halaman pembayaran Pakasir
            if (selectedPaymentMethod === "qris") {
                const slug = localStorage.getItem("cfg_pakasir_slug") || "vidora";
                const redirectTarget = window.location.origin + "/app?order_id=" + order.id + "&status=success";
                const pakasirPayUrl = `https://app.pakasir.com/pay/${slug}/${planPrice}?order_id=${order.id}&redirect=${encodeURIComponent(redirectTarget)}&qris_only=1&method=qris`;

                modalCheckout.classList.remove("open");
                alert(`Pemesanan ${order.id} Berhasil Dibuat!\n\nAnda akan dialihkan ke halaman pembayaran QRIS Pakasir.\nSetelah scan & bayar, akun Creator Pass (5 Profil Google) Anda akan AKTIF secara otomatis.`);
                window.location.href = pakasirPayUrl;
                return;
            }

            if (selectedPaymentMethod === "whatsapp") {
                const message = encodeURIComponent(
                    `Halo Admin VIDORA, saya ingin konfirmasi pemesanan lisensi:\n\n` +
                    `📋 *No Invoice:* ${order.id}\n` +
                    `📦 *Paket:* ${planTitle}\n` +
                    `💰 *Total:* Rp ${planPrice.toLocaleString("id-ID")}\n` +
                    `👤 *Nama:* ${name}\n` +
                    `📱 *WhatsApp:* ${phone}\n` +
                    `✉️ *Email:* ${email}\n\n` +
                    `Mohon dibantu aktivasi akun 5 Profil Google saya. Terima kasih!`
                );
                window.open(`https://wa.me/6281234567890?text=${message}`, "_blank");
            }

            modalCheckout.classList.remove("open");
            alert(`Pemesanan Berhasil!\n\nNomor Invoice: ${order.id}\nPaket: ${planTitle}\nTotal: Rp ${planPrice.toLocaleString("id-ID")}\n\nStatus: Menunggu Pembayaran/Verifikasi.`);

            // Activate Creator Pass with strictly 5 accounts max
            if (activeProfile) {
                if (activeProfile.role !== "superadmin") {
                    activeProfile.role = "user";
                    activeProfile.max_google_accounts = 5;
                }
                if (!window.vidoraData.isLive) {
                    activeProfile.is_subscribed = true;
                    if (subWarningBanner) subWarningBanner.style.display = "none";
                }
                updateHeaderUI();
            }
        } catch (err) {
            alert("Gagal memproses pesanan: " + err.message);
        }
    });

    // =========================================================================
    // 5. Super Admin Dashboard Controller
    // =========================================================================
    const adminSubTabBtns = document.querySelectorAll(".admin-sub-tab-btn");
    const adminSubviews = {
        connection: document.getElementById("adminsub-connection"),
        users: document.getElementById("adminsub-users"),
        queue: document.getElementById("adminsub-queue"),
        orders: document.getElementById("adminsub-orders"),
        whatsapp: document.getElementById("adminsub-whatsapp")
    };

    adminSubTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const sub = btn.getAttribute("data-adminsub");
            adminSubTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            Object.keys(adminSubviews).forEach(k => {
                if (k === sub) {
                    if (adminSubviews[k]) adminSubviews[k].style.display = "block";
                } else {
                    if (adminSubviews[k]) adminSubviews[k].style.display = "none";
                }
            });

            if (sub === "users") renderAdminUsers();
            if (sub === "queue") renderAdminQueue();
            if (sub === "orders") renderAdminOrders();
            if (sub === "whatsapp") renderAdminWhatsapp();
        });
    });

    async function renderAdminDashboard() {
        updateConnectionStatusPill();

        // Populate connection form fields
        const inputUrl = document.getElementById("inputSupabaseUrl");
        const inputKey = document.getElementById("inputSupabaseKey");
        const inputR2 = document.getElementById("inputR2Domain");

        if (inputUrl && !inputUrl.value) {
            inputUrl.value = localStorage.getItem("vidora_supabase_url") || (window.VIDORA_CONFIG.SUPABASE_URL.includes("your-project") ? "" : window.VIDORA_CONFIG.SUPABASE_URL);
        }
        if (inputKey && !inputKey.value) {
            inputKey.value = localStorage.getItem("vidora_supabase_key") || (window.VIDORA_CONFIG.SUPABASE_ANON_KEY.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") ? "" : window.VIDORA_CONFIG.SUPABASE_ANON_KEY);
        }
        if (inputR2 && !inputR2.value) {
            inputR2.value = localStorage.getItem("vidora_r2_domain") || (window.VIDORA_CONFIG.R2_PUBLIC_DOMAIN.includes("pub-your-id") ? "" : window.VIDORA_CONFIG.R2_PUBLIC_DOMAIN);
        }

        // Metrics
        const users = await window.vidoraData.getAllUsers();
        const jobs = await window.vidoraData.getAllJobsGlobal();
        const accounts = await window.vidoraData.getGoogleAccounts();

        document.getElementById("statTotalUsers").textContent = users.length;
        document.getElementById("statActiveJobs").textContent = jobs.filter(j => j.status === "processing" || j.status === "pending").length;
        document.getElementById("statCompletedJobs").textContent = jobs.filter(j => j.status === "completed").length;
        document.getElementById("statGoogleAccounts").textContent = accounts.length;
    }

    // Save Cloud Config (Supabase & Cloudflare R2)
    document.getElementById("formAdminCloudConfig").addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = document.getElementById("inputSupabaseUrl").value.trim();
        const key = document.getElementById("inputSupabaseKey").value.trim();
        const r2 = document.getElementById("inputR2Domain").value.trim();

        const isLive = window.vidoraData.saveCloudConfig(url, key, r2);
        updateConnectionStatusPill();

        if (isLive) {
            const test = await window.vidoraData.testConnection();
            alert("Berhasil!\n\n" + test.message);
        } else {
            alert("Pengaturan tersimpan dalam mode lokal/demo.");
        }
    });

    document.getElementById("btnAdminTestConnection").addEventListener("click", async () => {
        const res = await window.vidoraData.testConnection();
        updateConnectionStatusPill();
        alert(res.message);
    });

    // Copy SQL Schema Helper
    document.getElementById("btnCopySqlSchema").addEventListener("click", () => {
        const schemaNotice = `-- VIDORA Database Schema
-- Silakan jalankan file: supabase/schema.sql di Supabase SQL Editor Anda.
-- File ini sudah siap di folder d:\\VIDORA\\supabase\\schema.sql`;
        navigator.clipboard.writeText(schemaNotice);
        alert("Panduan disalin! Buka Supabase SQL Editor dan jalankan isi file: supabase/schema.sql");
    });

    // Render Admin Users
    let adminUsersList = [];
    async function renderAdminUsers() {
        const tbody = document.getElementById("adminUsersTableBody");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Memuat data pengguna...</td></tr>`;

        adminUsersList = await window.vidoraData.getAllUsers();
        renderAdminUsersTable();
    }

    function renderAdminUsersTable() {
        const tbody = document.getElementById("adminUsersTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const search = (document.getElementById("inputSearchAdminUsers")?.value || "").toLowerCase().trim();
        const filtered = adminUsersList.filter(u => {
            if (!search) return true;
            return (u.email || "").toLowerCase().includes(search) || (u.full_name || "").toLowerCase().includes(search);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-tertiary);">Tidak ada pengguna yang sesuai pencarian.</td></tr>`;
            return;
        }

        filtered.forEach(u => {
            const tr = document.createElement("tr");
            const isAdm = u.role === "admin" || u.role === "superadmin";
            const isSub = u.is_subscribed === true || isAdm;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color: white;">${u.full_name || 'Pengguna'}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">${u.email}</div>
                </td>
                <td>
                    <span class="${isAdm ? 'role-badge-admin' : 'role-badge-user'}">${isAdm ? 'Super Admin' : 'Member'}</span>
                </td>
                <td>
                    <span style="font-size: 11px; font-weight: 700; color: ${isSub ? '#10b981' : '#f59e0b'};">
                        ${isSub ? '● AKTIF (Creator Pass)' : '○ Non-Member'}
                    </span>
                </td>
                <td>
                    <span style="font-family: monospace; font-weight: 700;">${isAdm ? 'Unlimited' : (u.max_google_accounts || 5) + ' Akun'}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-table-action btn-toggle-user-sub" data-uid="${u.id}" data-cursub="${isSub}" style="color: ${isSub ? '#f43f5e' : '#10b981'}; font-weight: 700;">
                            ${isSub ? 'Nonaktifkan' : '✓ Aktifkan (5 Slot)'}
                        </button>
                        <button class="btn-table-action btn-toggle-user-role" data-uid="${u.id}" data-currole="${u.role}">
                            ${isAdm ? 'Jadikan Member' : 'Jadikan Admin'}
                        </button>
                        <button class="btn-table-action btn-del-user" data-uid="${u.id}" title="Hapus Akun Pengguna" style="color: var(--text-tertiary); padding: 4px 6px;">
                            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        lucide.createIcons();

        // Wire role toggle buttons
        document.querySelectorAll(".btn-toggle-user-role").forEach(btn => {
            btn.addEventListener("click", async () => {
                const uid = btn.getAttribute("data-uid");
                const cur = btn.getAttribute("data-currole");
                const nextRole = cur === "superadmin" || cur === "admin" ? "user" : "superadmin";
                await window.vidoraData.updateUserRole(uid, nextRole);
                await renderAdminUsers();
                await initApp();
            });
        });

        // Wire subscription toggle buttons
        document.querySelectorAll(".btn-toggle-user-sub").forEach(btn => {
            btn.addEventListener("click", async () => {
                const uid = btn.getAttribute("data-uid");
                const curSub = btn.getAttribute("data-cursub") === "true";
                await window.vidoraData.toggleUserSubscription(uid, !curSub);
                alert(`Status langganan pengguna berhasil diubah menjadi: ${!curSub ? 'AKTIF (5 Profil Google)' : 'NONAKTIF'}`);
                await renderAdminUsers();
                await initApp();
            });
        });

        // Wire delete user buttons
        document.querySelectorAll(".btn-del-user").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Yakin ingin menghapus data pengguna ini dari sistem?")) return;
                const uid = btn.getAttribute("data-uid");
                await window.vidoraData.deleteUser(uid);
                await renderAdminUsers();
            });
        });
    }

    document.getElementById("btnRefreshAdminUsers")?.addEventListener("click", renderAdminUsers);
    document.getElementById("inputSearchAdminUsers")?.addEventListener("input", renderAdminUsersTable);

    // Modal Admin Add User
    const modalAdminAddUser = document.getElementById("modalAdminAddUser");
    document.getElementById("btnOpenAddUserModal")?.addEventListener("click", () => {
        if (modalAdminAddUser) modalAdminAddUser.style.display = "flex";
    });
    document.getElementById("btnCloseAdminAddUser")?.addEventListener("click", () => {
        if (modalAdminAddUser) modalAdminAddUser.style.display = "none";
    });
    document.getElementById("formAdminAddUser")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("manualUserName").value.trim();
        const email = document.getElementById("manualUserEmail").value.trim();
        const role = document.getElementById("manualUserRole").value;
        const isSubscribed = document.getElementById("manualUserSubscribed").value === "true";

        await window.vidoraData.addUserManual({ fullName, email, role, isSubscribed });
        alert(`Pengguna ${email} berhasil didaftarkan dan statusnya telah ${isSubscribed ? 'AKTIF' : 'NONAKTIF'}.`);
        if (modalAdminAddUser) modalAdminAddUser.style.display = "none";
        document.getElementById("formAdminAddUser").reset();
        await renderAdminUsers();
    });

    // Render Admin Queue
    async function renderAdminQueue() {
        const tbody = document.getElementById("adminQueueTableBody");
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Memuat antrian...</td></tr>`;

        const jobs = await window.vidoraData.getAllJobsGlobal();
        tbody.innerHTML = "";

        if (jobs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-tertiary);">Belum ada antrian generate.</td></tr>`;
            return;
        }

        jobs.forEach(j => {
            const tr = document.createElement("tr");
            const statusColor = j.status === "completed" ? "#10b981" : (j.status === "failed" ? "#f43f5e" : "#00f2fe");
            
            tr.innerHTML = `
                <td>
                    <div style="font-family: monospace; font-size: 11px; color: var(--text-tertiary);">${(j.id || '').substring(0, 10)}...</div>
                    <div style="font-size: 10px; color: var(--text-tertiary);">${new Date(j.created_at).toLocaleTimeString("id-ID")}</div>
                </td>
                <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${j.prompt}
                </td>
                <td>
                    <span style="font-weight: 700; color: ${statusColor}; font-size: 11px;">${j.status.toUpperCase()} (${j.progress || 0}%)</span>
                </td>
                <td>
                    <button class="btn-table-action btn-cancel-job" data-jid="${j.id}" style="color: #f43f5e;">
                        Batal
                    </button>
                    <button class="btn-table-action btn-del-job" data-jid="${j.id}" style="color: var(--text-tertiary);">
                        Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll(".btn-cancel-job").forEach(b => {
            b.addEventListener("click", async () => {
                await window.vidoraData.cancelJob(b.getAttribute("data-jid"));
                renderAdminQueue();
                refreshJobs();
            });
        });

        document.querySelectorAll(".btn-del-job").forEach(b => {
            b.addEventListener("click", async () => {
                await window.vidoraData.deleteJob(b.getAttribute("data-jid"));
                renderAdminQueue();
                refreshJobs();
            });
        });
    }

    document.getElementById("btnRefreshAdminQueue")?.addEventListener("click", renderAdminQueue);

    // Render Admin Orders
    let adminOrdersList = [];
    async function renderAdminOrders() {
        const tbody = document.getElementById("adminOrdersTableBody");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Memuat pesanan...</td></tr>`;

        adminOrdersList = await window.vidoraData.getAllOrders();
        renderAdminOrdersTable();
    }

    function renderAdminOrdersTable() {
        const tbody = document.getElementById("adminOrdersTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const search = (document.getElementById("inputSearchAdminOrders")?.value || "").toLowerCase().trim();
        const filterStatus = document.getElementById("selectFilterAdminOrders")?.value || "all";

        const filtered = adminOrdersList.filter(o => {
            if (filterStatus !== "all" && o.status !== filterStatus) return false;
            if (!search) return true;
            return (o.id || "").toLowerCase().includes(search) || 
                   (o.customer_name || "").toLowerCase().includes(search) || 
                   (o.customer_phone || "").toLowerCase().includes(search) ||
                   (o.customer_email || "").toLowerCase().includes(search);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-tertiary);">Belum ada riwayat pesanan yang sesuai filter.</td></tr>`;
            return;
        }

        filtered.forEach(o => {
            const tr = document.createElement("tr");
            const isPaid = o.status === "paid";
            const cleanPhone = (o.customer_phone || "").replace(/[^0-9]/g, "");
            const waPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : (cleanPhone.startsWith("62") ? cleanPhone : "62" + cleanPhone);
            const waMsg = encodeURIComponent(`Halo ${o.customer_name}, terima kasih telah memesan ${o.plan_name || 'VIDORA Creator Pass'} (No Invoice: ${o.id}). Akun Anda sudah kami aktifkan dengan kuota 5 profil Google. Silakan login di https://www.vidora.biz.id/login!`);

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color: white;">${o.id}</div>
                    <div style="font-size: 10px; color: var(--text-tertiary);">${new Date(o.created_at || Date.now()).toLocaleDateString("id-ID")} ${new Date(o.created_at || Date.now()).toLocaleTimeString("id-ID", {hour:'2-digit', minute:'2-digit'})}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color: white;">${o.customer_name || '-'}</div>
                    <div style="font-size: 11px; color: var(--accent-cyan);">${o.customer_phone || '-'}</div>
                    <div style="font-size: 10px; color: var(--text-tertiary);">${o.customer_email || '-'}</div>
                </td>
                <td>
                    <div style="font-weight: 600; font-size: 12px;">${o.plan_name || 'Creator Pass'}</div>
                    <div style="font-size: 12px; font-weight: 800; color: #00f2fe;">Rp ${(o.price || 75000).toLocaleString("id-ID")}</div>
                </td>
                <td>
                    <span style="font-weight: 600; font-size: 11px;">${(o.payment_method || 'QRIS').toUpperCase()}</span>
                </td>
                <td>
                    <span style="font-weight: 700; color: ${isPaid ? '#10b981' : '#f59e0b'}; font-size: 11px;">
                        ${isPaid ? '● LUNAS (AKTIF)' : '○ PENDING'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${isPaid 
                            ? `<span style="font-size: 11px; color: #10b981; font-weight: 700; padding: 4px 6px;">✓ Aktif</span>`
                            : `<button class="btn-table-action btn-approve-order" data-oid="${o.id}" style="color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.15); font-weight: 700;">✓ Aktifkan</button>`
                        }
                        ${cleanPhone ? `
                            <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="btn-table-action" style="color: #6ee7b7; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;" title="Chat WhatsApp Pelanggan">
                                <i data-lucide="message-circle" style="width: 12px; height: 12px;"></i> WA
                            </a>
                        ` : ''}
                        <button class="btn-table-action btn-del-order" data-oid="${o.id}" title="Hapus Order" style="color: var(--text-tertiary); padding: 4px 6px;">
                            <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        lucide.createIcons();

        // Wire approve order
        document.querySelectorAll(".btn-approve-order").forEach(b => {
            b.addEventListener("click", async () => {
                const oid = b.getAttribute("data-oid");
                const targetOrder = adminOrdersList.find(o => o.id === oid);
                await window.vidoraData.approveOrder(oid);
                await renderAdminOrders();

                // Trigger WhatsApp Notification via xsender.id if configured
                if (window.xsender && targetOrder) {
                    window.xsender.notifyOrderApproved(targetOrder).then(res => {
                        if (res && res.success) {
                            alert(`Pesanan ${oid} berhasil diaktifkan!\nNotifikasi WhatsApp aktivasi paket telah dikirim ke ${targetOrder.customer_phone || targetOrder.customer_name}.`);
                        } else {
                            alert(`Pesanan ${oid} BERHASIL DIAKTIFKAN!\nPaket 5 Profil Akun Google pengguna telah aktif seketika.`);
                        }
                    }).catch(() => {
                        alert(`Pesanan ${oid} BERHASIL DIAKTIFKAN!\nPaket pengguna telah aktif.`);
                    });
                } else {
                    alert(`Pesanan ${oid} BERHASIL DIAKTIFKAN!\nPaket 5 Profil Akun Google pengguna telah aktif seketika.`);
                }
            });
        });

        // Wire delete order
        document.querySelectorAll(".btn-del-order").forEach(b => {
            b.addEventListener("click", async () => {
                if (!confirm("Hapus pesanan ini dari riwayat?")) return;
                const oid = b.getAttribute("data-oid");
                await window.vidoraData.deleteOrder(oid);
                await renderAdminOrders();
            });
        });
    }

    document.getElementById("btnRefreshAdminOrders")?.addEventListener("click", renderAdminOrders);
    document.getElementById("inputSearchAdminOrders")?.addEventListener("input", renderAdminOrdersTable);
    document.getElementById("selectFilterAdminOrders")?.addEventListener("change", renderAdminOrdersTable);

    // Modal Admin Add Order Manual
    const modalAdminAddOrder = document.getElementById("modalAdminAddOrder");
    document.getElementById("btnOpenAddOrderModal")?.addEventListener("click", () => {
        if (modalAdminAddOrder) modalAdminAddOrder.style.display = "flex";
    });
    document.getElementById("btnCloseAdminAddOrder")?.addEventListener("click", () => {
        if (modalAdminAddOrder) modalAdminAddOrder.style.display = "none";
    });
    document.getElementById("formAdminAddOrder")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("manualOrderName").value.trim();
        const phone = document.getElementById("manualOrderPhone").value.trim();
        const email = document.getElementById("manualOrderEmail").value.trim();
        const method = document.getElementById("manualOrderMethod").value;
        const status = document.getElementById("manualOrderStatus").value;

        const newOrder = await window.vidoraData.createOrder({
            plan: "VIDORA Creator Pass",
            price: 75000,
            name,
            phone,
            email,
            method,
            status
        });

        if (status === "paid") {
            await window.vidoraData.approveOrder(newOrder.id);
        }

        alert(`Order manual ${newOrder.id} berhasil disimpan!\nStatus: ${status === 'paid' ? 'LUNAS & AKUN TELAH DIAKTIFKAN (5 PROFIL)' : 'PENDING'}.`);
        if (modalAdminAddOrder) modalAdminAddOrder.style.display = "none";
        document.getElementById("formAdminAddOrder").reset();
        await renderAdminOrders();
    });

    // =========================================================================
    // 5.1 Super Admin WhatsApp Gateway Controller (xsender.id)
    // =========================================================================
    function renderAdminWhatsapp() {
        if (!window.xsender) return;
        const cfg = window.xsender.config;

        const tokenInput = document.getElementById("xsenderApiKey") || document.getElementById("xsenderApiToken");
        const deviceInput = document.getElementById("xsenderSender") || document.getElementById("xsenderDeviceId");
        const adminPhoneInput = document.getElementById("xsenderAdminPhone");
        const chkOrder = document.getElementById("checkNotifyOrder");
        const chkApproval = document.getElementById("checkNotifyApproval");
        const chkRender = document.getElementById("checkNotifyRender");
        const tplApproval = document.getElementById("xsenderTemplateApproval");

        if (tokenInput) tokenInput.value = cfg.apiKey || cfg.apiToken || "";
        if (deviceInput) deviceInput.value = cfg.sender || cfg.deviceId || "";
        if (adminPhoneInput) adminPhoneInput.value = cfg.adminPhone || "";
        if (chkOrder) chkOrder.checked = cfg.notifyOnOrder !== false;
        if (chkApproval) chkApproval.checked = cfg.notifyOnApproval !== false;
        if (chkRender) chkRender.checked = cfg.notifyOnRender !== false;
        if (tplApproval) tplApproval.value = cfg.templateApproval || "";
    }

    const formAdminXsender = document.getElementById("formAdminXsenderConfig");
    if (formAdminXsender) {
        formAdminXsender.addEventListener("submit", async (e) => {
            e.preventDefault();
            const tokenInput = document.getElementById("xsenderApiKey") || document.getElementById("xsenderApiToken");
            const senderInput = document.getElementById("xsenderSender") || document.getElementById("xsenderDeviceId");
            const newCfg = {
                apiKey: tokenInput ? tokenInput.value.trim() : "",
                sender: senderInput ? senderInput.value.trim() : "",
                adminPhone: document.getElementById("xsenderAdminPhone").value.trim(),
                notifyOnOrder: document.getElementById("checkNotifyOrder").checked,
                notifyOnApproval: document.getElementById("checkNotifyApproval").checked,
                notifyOnRender: document.getElementById("checkNotifyRender").checked,
                templateApproval: document.getElementById("xsenderTemplateApproval").value.trim()
            };
            if (window.xsender) {
                await window.xsender.saveConfig(newCfg);
            }
            alert("Pengaturan WhatsApp Gateway (xsender.id) berhasil disimpan!");
        });
    }

    const btnSendTestWa = document.getElementById("btnSendTestWa");
    if (btnSendTestWa) {
        btnSendTestWa.addEventListener("click", async () => {
            const phone = document.getElementById("testWaTargetPhone").value.trim();
            const resElem = document.getElementById("testWaResult");
            if (!phone) {
                alert("Harap masukkan nomor WhatsApp tujuan untuk uji coba!");
                return;
            }

            btnSendTestWa.disabled = true;
            btnSendTestWa.innerHTML = `<span>Mengirim...</span>`;
            resElem.style.display = "block";
            resElem.style.background = "rgba(99, 102, 241, 0.1)";
            resElem.style.color = "#a5b4fc";
            resElem.textContent = "Sedang mengirim pesan tes ke " + phone + "...";

            const result = await window.xsender.sendWhatsApp(
                phone,
                "🔔 *Uji Coba Notifikasi VIDORA AI Studio via xsender.id*\n\nSelamat! Koneksi WhatsApp Gateway VIDORA Anda berhasil terhubung dan siap digunakan untuk produksi."
            );

            btnSendTestWa.disabled = false;
            btnSendTestWa.innerHTML = `<i data-lucide="send" style="width: 14px; height: 14px;"></i> <span>Kirim Pesan Tes</span>`;
            lucide.createIcons();

            if (result.success) {
                resElem.style.background = "rgba(16, 185, 129, 0.15)";
                resElem.style.color = "#6ee7b7";
                resElem.innerHTML = `✅ <strong>Berhasil!</strong> ${result.message}`;
            } else {
                resElem.style.background = "rgba(244, 63, 94, 0.15)";
                resElem.style.color = "#fda4af";
                resElem.innerHTML = `❌ <strong>Gagal:</strong> ${result.message}`;
            }
        });
    }

    // =========================================================================
    // 6. File Upload Handlers (Foto Produk)
    // =========================================================================
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

                // Sync across subviews if empty
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

    // Style Chips toggle (Video Generator)
    const videoStyleChipsContainer = document.getElementById("videoStyleChips");
    let selectedVideoStyle = "cinematic";
    if (videoStyleChipsContainer) {
        videoStyleChipsContainer.querySelectorAll(".style-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                videoStyleChipsContainer.querySelectorAll(".style-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                selectedVideoStyle = chip.getAttribute("data-style");
            });
        });
    }

    // Style Chips toggle (Image Generator)
    const imageStyleChipsContainer = document.getElementById("imageStyleChips");
    let selectedImageStyle = "studio";
    if (imageStyleChipsContainer) {
        imageStyleChipsContainer.querySelectorAll(".style-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                imageStyleChipsContainer.querySelectorAll(".style-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                selectedImageStyle = chip.getAttribute("data-style");
            });
        });
    }

    // PG Mode toggle (Prompt Generator)
    const pgModeHidden = document.getElementById("pgModeSelect");
    document.querySelectorAll(".pg-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".pg-mode-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (pgModeHidden) pgModeHidden.value = btn.getAttribute("data-pgmode");
        });
    });

    // PG Style Cards toggle (Prompt Generator)
    const pgStyleHidden = document.getElementById("pgStyleSelect");
    const pgStyleGrid = document.getElementById("pgStyleGrid");
    if (pgStyleGrid) {
        pgStyleGrid.querySelectorAll(".style-card").forEach(card => {
            card.addEventListener("click", () => {
                pgStyleGrid.querySelectorAll(".style-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                if (pgStyleHidden) pgStyleHidden.value = card.getAttribute("data-pgstyle");
            });
        });
    }

    // Ratio & Duration toggles
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

    // =========================================================================
    // 7. BYOK: Gemini API Key Handling (Sinkronisasi Antar Perangkat HP & PC)
    // =========================================================================
    const REVOKED_GEMINI_KEYS = ["AIzaSyDe5r_8aoYCBcjZ8uzyXCJURp-xG_fAMCo"];
    const userGeminiKeyInput = document.getElementById("userGeminiKeyInput");
    const btnSaveGeminiKey = document.getElementById("btnSaveGeminiKey");
    const btnTestGeminiKey = document.getElementById("btnTestGeminiKey");
    const geminiTestFeedback = document.getElementById("geminiTestFeedback");
    const geminiKeyStatusBadge = document.getElementById("geminiKeyStatusBadge");
    const btnToggleShowGeminiKey = document.getElementById("btnToggleShowGeminiKey");
    const eyeIconGemini = document.getElementById("eyeIconGemini");

    // Bersihkan segera jika di localStorage tersimpan key yang sudah kedaluwarsa/bocor
    (function sanitizeInitialKey() {
        const stored = (localStorage.getItem("vidora_user_gemini_key") || "").trim();
        if (REVOKED_GEMINI_KEYS.includes(stored)) {
            localStorage.removeItem("vidora_user_gemini_key");
        }
    })();

    async function testGeminiApiKey(key) {
        if (!key) return { success: false, message: "API Key belum diisi." };
        if (REVOKED_GEMINI_KEYS.includes(key)) {
            return { success: false, message: "API Key ini telah kedaluwarsa / dinonaktifkan oleh Google AI Studio." };
        }
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
            if (resp.ok) {
                return { success: true };
            }
            const data = await resp.json().catch(() => ({}));
            const msg = data.error?.message || `HTTP Status ${resp.status}`;
            return { success: false, message: msg };
        } catch (e) {
            return { success: false, message: e.message || "Gagal menghubungi server Google AI Studio." };
        }
    }

    async function syncGeminiKeyToCloud(key) {
        const userEmail = (currentUser?.email || activeProfile?.email || localStorage.getItem("vidora_user_email") || "").trim().toLowerCase();
        if (!userEmail) return;
        try {
            if (window.vidoraData?.client && currentUser) {
                await window.vidoraData.client.auth.updateUser({
                    data: { gemini_api_key: key }
                }).catch(() => {});
            }
            await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_user_gemini_key",
                    userId: currentUser?.id || "",
                    email: userEmail,
                    key: key
                })
            });
        } catch (err) {
            console.warn("[Gemini Key] Cloud sync error:", err);
        }
    }

    async function loadUserGeminiKey() {
        let savedKey = (localStorage.getItem("vidora_user_gemini_key") || "").trim();
        if (REVOKED_GEMINI_KEYS.includes(savedKey)) {
            localStorage.removeItem("vidora_user_gemini_key");
            savedKey = "";
        }

        const userEmail = (currentUser?.email || activeProfile?.email || localStorage.getItem("vidora_user_email") || "").trim().toLowerCase();

        // 1. Ambil dari Cloud (HP <-> PC sync jika user terdaftar)
        if (userEmail) {
            try {
                const res = await fetch(`/api/manage-order?action=get_user_gemini_key&email=${encodeURIComponent(userEmail)}&userId=${currentUser?.id || ""}`);
                const data = await res.json();
                if (data && data.key && data.key.trim() !== "") {
                    const fetchedKey = data.key.trim();
                    if (!REVOKED_GEMINI_KEYS.includes(fetchedKey)) {
                        savedKey = fetchedKey;
                        localStorage.setItem("vidora_user_gemini_key", savedKey);
                    }
                } else if (savedKey) {
                    syncGeminiKeyToCloud(savedKey);
                }
            } catch (e) {
                console.warn("[Gemini Key] Cloud fetch error:", e);
            }
        }

        if (savedKey) {
            if (userGeminiKeyInput) userGeminiKeyInput.value = savedKey;
            if (geminiKeyStatusBadge) {
                geminiKeyStatusBadge.textContent = "Tersimpan";
                geminiKeyStatusBadge.style.background = "rgba(16, 185, 129, 0.15)";
                geminiKeyStatusBadge.style.color = "#10b981";
            }
        } else {
            if (userGeminiKeyInput) userGeminiKeyInput.value = "";
            if (geminiKeyStatusBadge) {
                geminiKeyStatusBadge.textContent = "Belum Diisi";
                geminiKeyStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
                geminiKeyStatusBadge.style.color = "#f87171";
            }
        }
    }
    loadUserGeminiKey();

    if (btnTestGeminiKey) {
        btnTestGeminiKey.addEventListener("click", async () => {
            const key = (userGeminiKeyInput ? userGeminiKeyInput.value : "").trim().replace(/^["']|["']$/g, "");
            if (!key) {
                alert("Silakan masukkan API Key Gemini Anda di kotak input terlebih dahulu.");
                if (userGeminiKeyInput) userGeminiKeyInput.focus();
                return;
            }

            const origHtml = btnTestGeminiKey.innerHTML;
            btnTestGeminiKey.disabled = true;
            btnTestGeminiKey.innerHTML = `<i data-lucide="loader" class="spin" style="width:14px;height:14px;"></i> <span>Menguji...</span>`;
            if (window.lucide) lucide.createIcons();

            if (geminiTestFeedback) {
                geminiTestFeedback.style.display = "block";
                geminiTestFeedback.style.background = "rgba(56, 189, 248, 0.1)";
                geminiTestFeedback.style.color = "#38bdf8";
                geminiTestFeedback.textContent = "Sedang menghubungi Google AI Studio...";
            }

            const res = await testGeminiApiKey(key);
            btnTestGeminiKey.disabled = false;
            btnTestGeminiKey.innerHTML = origHtml;
            if (window.lucide) lucide.createIcons();

            if (res.success) {
                if (geminiKeyStatusBadge) {
                    geminiKeyStatusBadge.textContent = "Valid & Aktif";
                    geminiKeyStatusBadge.style.background = "rgba(16, 185, 129, 0.15)";
                    geminiKeyStatusBadge.style.color = "#10b981";
                }
                if (geminiTestFeedback) {
                    geminiTestFeedback.style.background = "rgba(16, 185, 129, 0.15)";
                    geminiTestFeedback.style.color = "#10b981";
                    geminiTestFeedback.textContent = "✅ Koneksi Berhasil! API Key Gemini Anda valid dan aktif di Google AI Studio.";
                }
            } else {
                if (geminiKeyStatusBadge) {
                    geminiKeyStatusBadge.textContent = "Tidak Valid";
                    geminiKeyStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
                    geminiKeyStatusBadge.style.color = "#f87171";
                }
                if (geminiTestFeedback) {
                    geminiTestFeedback.style.background = "rgba(239, 68, 68, 0.15)";
                    geminiTestFeedback.style.color = "#f87171";
                    geminiTestFeedback.textContent = `❌ Gagal: ${res.message}. Pastikan API Key aktif di aistudio.google.com/app/apikey`;
                }
            }
        });
    }

    btnSaveGeminiKey.addEventListener("click", async () => {
        let key = userGeminiKeyInput.value.trim().replace(/^["']|["']$/g, "");
        if (!key) {
            localStorage.removeItem("vidora_user_gemini_key");
            await syncGeminiKeyToCloud("");
            await loadUserGeminiKey();
            if (geminiTestFeedback) geminiTestFeedback.style.display = "none";
            alert("API Key Gemini dihapus dari perangkat dan akun Anda.");
            return;
        }

        if (REVOKED_GEMINI_KEYS.includes(key)) {
            alert("Peringatan: API Key ini sudah dinonaktifkan/kedaluwarsa oleh Google.\n\nSilakan buat API Key baru secara gratis di aistudio.google.com/app/apikey");
            if (userGeminiKeyInput) userGeminiKeyInput.focus();
            return;
        }

        const origHtml = btnSaveGeminiKey.innerHTML;
        btnSaveGeminiKey.disabled = true;
        btnSaveGeminiKey.innerHTML = `<span>Memverifikasi ke Google...</span>`;

        const testRes = await testGeminiApiKey(key);
        if (!testRes.success) {
            btnSaveGeminiKey.disabled = false;
            btnSaveGeminiKey.innerHTML = origHtml;
            if (window.lucide) lucide.createIcons();

            if (geminiKeyStatusBadge) {
                geminiKeyStatusBadge.textContent = "Tidak Valid";
                geminiKeyStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
                geminiKeyStatusBadge.style.color = "#f87171";
            }
            if (geminiTestFeedback) {
                geminiTestFeedback.style.display = "block";
                geminiTestFeedback.style.background = "rgba(239, 68, 68, 0.15)";
                geminiTestFeedback.style.color = "#f87171";
                geminiTestFeedback.textContent = `❌ Key tidak valid: ${testRes.message}`;
            }

            const stillSave = confirm(
                `Google AI Studio menolak API Key ini:\n"${testRes.message}"\n\nApakah Anda tetap ingin menyimpannya? (Disarankan untuk memeriksa kembali key Anda di aistudio.google.com)`
            );
            if (!stillSave) return;
        }

        localStorage.setItem("vidora_user_gemini_key", key);
        await syncGeminiKeyToCloud(key);
        await loadUserGeminiKey();

        btnSaveGeminiKey.disabled = false;
        btnSaveGeminiKey.innerHTML = origHtml;
        if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();

        if (geminiTestFeedback) {
            geminiTestFeedback.style.display = "block";
            geminiTestFeedback.style.background = "rgba(16, 185, 129, 0.15)";
            geminiTestFeedback.style.color = "#10b981";
            geminiTestFeedback.textContent = "✅ API Key Gemini berhasil disimpan & terverifikasi siap digunakan!";
        }

        alert("✅ API Key Gemini berhasil disimpan dan siap digunakan untuk analisa foto & auto prompt!");
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
        const key = (localStorage.getItem("vidora_user_gemini_key") || "").trim();
        if (REVOKED_GEMINI_KEYS.includes(key)) {
            localStorage.removeItem("vidora_user_gemini_key");
            return "";
        }
        return key;
    }

    // Robust Cascade Gemini API Caller (Mencoba Gemini 2.0 Flash, 1.5 Flash Latest, dsb secara otomatis)
    async function callGeminiGenerateContent(apiKey, requestBody) {
        const candidateModels = [
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
        ];

        let lastError = null;
        for (const endpoint of candidateModels) {
            try {
                const response = await fetch(`${endpoint}?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    return await response.json();
                }

                const errData = await response.json().catch(() => ({}));
                const msg = errData.error?.message || `HTTP ${response.status}`;
                lastError = new Error(msg);

                // Jika error adalah kuota habis atau key invalid, hentikan langsung
                if (response.status === 400 && !msg.toLowerCase().includes("not found") && !msg.toLowerCase().includes("not supported")) {
                    throw lastError;
                }
            } catch (err) {
                lastError = err;
                if (err.message && !err.message.toLowerCase().includes("not found") && !err.message.toLowerCase().includes("not supported") && !err.message.includes("404")) {
                    throw err;
                }
            }
        }

        // Jika semua model standar gagal, gunakan ListModels API untuk menemukan model yang didukung oleh API key ini
        try {
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (listResp.ok) {
                const listData = await listResp.json();
                const available = listData.models?.find(m => 
                    m.supportedGenerationMethods?.includes("generateContent") &&
                    (m.name?.includes("flash") || m.name?.includes("pro") || m.name?.includes("gemini"))
                );
                if (available && available.name) {
                    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/${available.name}:generateContent?key=${apiKey}`;
                    const resp = await fetch(fallbackUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    });
                    if (resp.ok) {
                        return await resp.json();
                    }
                }
            }
        } catch (_) {}

        throw lastError || new Error("Model Gemini tidak ditemukan untuk API Key ini.");
    }

    // VIDORA Built-in Smart Prompt Generator Fallback (Jika API Key belum diset atau Google API bermasalah)
    function generateFallbackPrompt(mode, style, platform, extra = "", ctaType = "auto", customCta = "") {
        const platformMap = {
            tiktok: "Target Platform: TikTok Short Video (9:16). High energy hook in first 2 seconds, punchy visual rhythm, trending viral aesthetic.",
            tiktok_aff: "Target Platform: TikTok Shop Affiliate (9:16). Clear product feature demonstration, high-conversion visual framing pointing to yellow basket.",
            tiktok_go_hotel: "Target Platform: TikTok Go Hotel & Staycation. Inviting room tour, cozy bed textures, luxurious bathroom amenities, relaxing holiday vibes.",
            tiktok_go_wisata: "Target Platform: TikTok Go Wisata. Spectacular wide panoramic shots, vibrant natural scenery, landmark highlights, travel inspiration.",
            tiktok_go_kuliner: "Target Platform: TikTok Go Kuliner. Sizzling warm dishes, mouth-watering close-up of delicious textures, vibrant culinary appeal.",
            shopee: "Target Platform: Shopee Video. Bright commercial lighting, discount voucher callout feel, product detail focus, pointing to orange basket.",
            instagram: "Target Platform: Instagram Reels. Clean luxury modern aesthetic, seamless lifestyle loop, aesthetic color grading.",
            youtube: "Target Platform: YouTube Shorts. Dynamic pacing, clear value proposition in first 3 seconds, clean branding throughout.",
            youtube_long: "Target Platform: YouTube Long-Form (16:9 Landscape). Cinematic widescreen composition, steady camera motion, rich immersive atmosphere."
        };

        const styleMap = {
            hard_selling: "Commercial TV style, high-energy explosive camera movement, vivid saturated lighting, razor-sharp product focus, 4k 60fps octane render quality.",
            soft_selling: "Aesthetic lifestyle cinematography, warm golden hour ambient lighting, cozy aspirational atmosphere, smooth subtle panning camera, shallow depth of field.",
            storyboard: "Sequential 3-stage commercial presentation: attention hook, tactile product demonstration, and high-conversion commercial showcase.",
            unboxing: "First-person perspective unboxing showcase, tactile peeling of protective film, revealing pristine product, soft diffused studio light, 8k resolution.",
            before_after: "Dramatic transformation showcase, cinematic transition from dull to glowing flawless finished state, crisp photorealistic textures.",
            comparison_vs: "Split comparison showcase highlighting superior premium finish, ultra-detailed macro textures, crisp reflections.",
            trend_challenge: "Trendy viral pacing, dynamic snappy transitions, modern studio neon and natural pop lighting, ultra-fluid motion.",
            vlog_bts: "Behind-the-scenes authentic creator POV, natural ambient lighting, genuine candid movement, true-to-life color grading.",
            aesthetic: "Aesthetic indie cinema masterpiece, moody teal and warm amber contrast, slow poetic tracking shot, volumetric dust particles, anamorphic lens flare.",
            cinematic: "Cinematic commercial masterpiece, moody volumetric lighting, subtle anamorphic lens flare, film grain, smooth gimbal push-in, 4k 60fps.",
            edukasi: "Clean instructional framing, balanced composition, bright neutral studio lighting, sharp clear subject focus.",
            tutorial: "Step-by-step tutorial framing, neat clean background, clear product usage demonstration, professional softbox lighting.",
            pov: "Relatable first-person POV shot looking down at hands using the product, authentic natural daylight, realistic domestic or workplace environment.",
            asmr: "Extreme macro ASMR close-up, ultra-detailed product surface and tactile interaction, glossy reflection, intimate serene atmosphere.",
            studio: "Clean commercial product studio photography, pure minimalist background, professional 3-point softbox lighting, ultra-sharp edges, catalog ready 8k quality.",
            ugc: "Authentic UGC smartphone style framing, natural indoor daylight, genuine relatable handheld movement, crisp true-to-life color reproduction.",
            beauty: "Dewy glowing glass-skin aesthetic, soft ring-light glow, flawless skin textures and reflective serum drops, macro close-up focus, luxury cosmetic aesthetic."
        };

        const chosenStyle = styleMap[style] || styleMap.cinematic;
        const chosenPlatform = platformMap[platform] || platformMap.tiktok;
        const ctaText = customCta ? `Closing CTA: "${customCta}".` : (ctaType !== "auto" ? `Closing CTA: ${ctaType}.` : "");
        const extraText = extra ? `Creator Notes: ${extra}.` : "";

        return `Commercial photorealistic shot of featured subject. ${chosenStyle} ${chosenPlatform} ${extraText} ${ctaText} Cinematic lighting, 4k 60fps, octane render quality, film grain, hyperrealistic commercial master.`.trim();
    }

    // Gemini Vision API Caller
    async function analyzeProductImageWithGemini(base64Data, mode, style, platform, extra = "", ctaType = "auto", customCta = "") {
        const apiKey = getUserGeminiKey();
        if (!apiKey) {
            const goToSettings = confirm(
                "Perhatian: Anda belum memasukkan API Key Gemini!\n\n" +
                "• Klik 'OK' untuk membuka tab 'Pengaturan' & memasukkan API Key Gemini gratis dari aistudio.google.com\n" +
                "• Klik 'Cancel' untuk tetap membuat prompt video sinematik secara otomatis (menggunakan Built-in Smart Engine)."
            );
            if (goToSettings) {
                switchTab("accounts");
                if (userGeminiKeyInput) userGeminiKeyInput.focus();
                return null;
            }
            return generateFallbackPrompt(mode, style, platform, extra, ctaType, customCta);
        }

        let mimeType = "image/jpeg";
        let cleanB64 = base64Data;
        if (base64Data.includes(";base64,")) {
            const parts = base64Data.split(";base64,");
            mimeType = parts[0].replace("data:", "");
            cleanB64 = parts[1];
        }

        let platformInstruction = "General social media short-form video style.";
        if (platform === "tiktok") {
            platformInstruction = "Target Platform: TikTok Short Video (9:16). High energy hook in first 2 seconds, punchy visual rhythm, natural viral aesthetic.";
        } else if (platform === "tiktok_aff") {
            platformInstruction = "Target Platform: TikTok Shop Affiliate (9:16). Clear product feature demonstration, high-conversion visual framing, and cue: Cek Keranjang Kuning di bawah!";
        } else if (platform === "tiktok_go_hotel") {
            platformInstruction = "Target Platform: TikTok Go Hotel & Staycation. Inviting room tour, cozy bed textures, luxurious bathroom amenities, relaxing holiday vibes.";
        } else if (platform === "tiktok_go_wisata") {
            platformInstruction = "Target Platform: TikTok Go Wisata / Travel Destination. Spectacular wide panoramic shots, vibrant natural scenery, landmark highlights, travel inspiration.";
        } else if (platform === "tiktok_go_kuliner") {
            platformInstruction = "Target Platform: TikTok Go Kuliner / Food. Sizzling warm dishes, mouth-watering close-up of delicious textures, vibrant culinary appeal.";
        } else if (platform === "shopee") {
            platformInstruction = "Target Platform: Shopee Video. Bright commercial lighting, discount voucher callout feel, product detail focus, and cue: Klik Keranjang Oranye di bawah!";
        } else if (platform === "instagram" || platform === "reels") {
            platformInstruction = "Target Platform: Instagram Reels / Feed. Clean luxury modern aesthetic, seamless lifestyle loop, aesthetic color grading.";
        } else if (platform === "youtube") {
            platformInstruction = "Target Platform: YouTube Shorts. Dynamic pacing, clear value proposition in first 3 seconds, clean branding throughout.";
        } else if (platform === "youtube_long") {
            platformInstruction = "Target Platform: YouTube Long-Form (16:9 Landscape). Cinematic widescreen composition, steady camera motion, rich immersive atmosphere for deep engagement.";
        } else if (platform === "ads") {
            platformInstruction = "Target Platform: Paid digital ads (Meta/TikTok Ads). High-impact first frame, immediate visual hook, strong commercial CTA.";
        } else if (platform === "marketplace") {
            platformInstruction = "Target Platform: Marketplace product listing (Shopee/Tokopedia). Crystal-clear product detail, clean background, professional studio lighting.";
        } else if (platform === "katalog") {
            platformInstruction = "Target Platform: Product catalog / print material. Ultra-sharp details, perfect color accuracy, premium editorial quality.";
        }

        let ctaInstruction = "";
        if (ctaType === "tiktok_go") {
            ctaInstruction = "Closing CTA Cue: Klaim promo langsung di lokasi / cek info maps sekarang.";
        } else if (ctaType === "shopee_aff") {
            ctaInstruction = "Closing CTA Cue: Klik Keranjang Oranye di bawah sebelum voucher habis!";
        } else if (ctaType === "tiktok_aff") {
            ctaInstruction = "Closing CTA Cue: Cek Keranjang Kuning di kiri bawah sekarang juga!";
        } else if (ctaType === "tiktok") {
            ctaInstruction = "Closing CTA Cue: Jangan lupa follow akun ini dan tulis pendapatmu di komentar!";
        } else if (ctaType === "sosmed") {
            ctaInstruction = "Closing CTA Cue: Like, simpan, dan share video ini ke teman-temanmu!";
        } else if (ctaType === "custom" && customCta) {
            ctaInstruction = `Closing CTA Cue: ${customCta}`;
        }

        // 17 Visual style instruction map
        const styleInstructions = {
            hard_selling: "Style: Hard Selling Commercial (Iklan TV). High-energy composition, bold product hero shot with exploding dynamic action, motion blur trails, bright saturated colors, urgency-focused commercial framing with direct purchasing cues.",
            hardselling: "Style: Hard Selling Commercial (Iklan TV). High-energy composition, bold product hero shot with exploding dynamic action, motion blur trails, bright saturated colors, urgency-focused commercial framing.",
            soft_selling: "Style: Soft Selling Lifestyle & Storytelling. Warm pastel tones, natural golden hour lighting, product integrated into a cozy aspirational scene, gentle camera movement, deep emotional connection without hard sales pressure.",
            softselling: "Style: Soft Selling Lifestyle & Storytelling. Warm pastel tones, natural golden hour lighting, product integrated into a cozy aspirational scene, gentle camera movement, deep emotional connection.",
            storyboard: "Style: Storyboard Multi-Scene. Structured sequential cinematic shots (Scene 1: Establishing contextual atmosphere; Scene 2: Close-up product interaction; Scene 3: High-impact transformation result), fluid cinematic transitions.",
            unboxing: "Style: Unboxing & Haul. First-person or tabletop perspective unwrapping premium packaging, tactile peeling of protective film, revealing pristine product, authentic excitement and crisp detail.",
            before_after: "Style: Before-After Transformation. Dramatic contrast split or smooth wipe transition showing dull/problematic state transformed into a glowing, flawless, highly satisfying finished state.",
            comparison_vs: "Style: Comparison / VS Battle. Side-by-side or split visual comparison clearly illustrating the superior texture, finish, and premium feel of the featured subject compared to ordinary alternatives.",
            trend_challenge: "Style: Trend & Viral Challenge. Trendy fast-paced visual hooks, modern TikTok transition snaps, vibrant neon or natural pop lighting, meme/relatable pacing, dynamic beats.",
            vlog_bts: "Style: Behind The Scenes / Casual Daily Vlog. Authentic creator POV, candid handheld camera movement, genuine production or preparation moments, welcoming warm ambient lighting.",
            musik_playlist: "Style: Musik Playlist / Penyanyi. Static tripod framing, gentle ambient micro-motion (soft breeze, flickering subtle neon, slow atmospheric dust particles, gentle singer sway), ultra-relaxed cozy aesthetic.",
            vlog_alam: "Style: Nature & Landscape Cinematic Drone. Grand expansive drone aerial tracking shot over misty mountain ridges, turquoise ocean waves crashing on cliffs, sunbeams cutting through forest canopy, 4K 60fps IMAX scope.",
            aesthetic: "Style: Aesthetic Cinematic (Non-Commercial). Moody color grading, artistic negative space, poetic slow motion, evocative rim lighting, indie film festival visual masterpiece.",
            cinematic: "Style: Aesthetic Cinematic. Moody volumetric lighting, subtle lens flare, film grain, cinematic teal-orange color grading, smooth slow tracking shot.",
            edukasi: "Style: Educational & Tips. Clean instructional framing, crisp focal subject, balanced composition leaving headroom/side space for graphics or captions, bright clear neutral lighting.",
            tutorial: "Style: Educational & Tutorial. Step-by-step instructional framing, clear product usage demonstration, neat studio background.",
            pov: "Style: POV (Point of View Relatable). First-person perspective looking down at hands using the product, authentic everyday situation, relatable domestic or travel environment.",
            asmr: "Style: ASMR & Satisfying Sensory. Extreme macro close-up of product textures, surfaces, and tactile interactions (creamy lather, crisp cutting, bubbling fizz, glossy liquid drizzle), intimate calming visuals.",
            tiktok_go_wisata: "Style: TikTok Go - Tempat Wisata. Sun-drenched panoramic vacation spot, happy travelers enjoying scenic viewpoints, crystal-clear water, vibrant tropical or alpine destination allure.",
            tiktok_go_kuliner: "Style: TikTok Go - Kuliner & Makanan. Sizzling skillet, rising aromatic steam, glistening sauces, macro cheese pulls, warm appetizing amber restaurant lighting.",
            tiktok_go_hotel: "Style: TikTok Go - Hotel & Penginapan. Chic hotel lobby, serene resort balcony view, fluffy pristine king-size bedding, warm ambient luxury interior hospitality lighting.",
            ugc: "Style: UGC Authentic. Handheld smartphone camera feel, natural ambient lighting, genuine unedited texture, realistic everyday context.",
            beauty: "Style: Beauty & Skincare. Dewy glass-skin aesthetic, model close-up with flawless complexion, soft rose/peachy studio lights, glistening serum droplet.",
            minimalist: "Style: Minimalist Clean. Pure white or deep dark studio backdrop, single hero subject, sharp sculptural shadows, high-end design aesthetic.",
            luxury: "Style: Luxury Prestige. Dark moodboard, gold-black-marble textures, dramatic single-source spotlight, slow rotating pedestal, ultra-shallow depth of field.",
            lifestyle: "Style: Lifestyle Activity. Product in natural human activity context, natural daylight, candid movement, real-world authenticity.",
            studio: "Style: Clean Product Studio. Pure white/gradient studio background, professional 3-point lighting setup, sharp product detail, catalog-ready quality."
        };
        const styleInstruction = styleInstructions[style] || styleInstructions.cinematic;

        const systemPrompt = `You are VIDORA Smart Prompt Generator, an elite commercial director, cinematographer, and prompt engineer.
Your task: Analyze the provided image/details and generate an extremely rich, cinematic, photorealistic prompt optimized for AI video generation (Google Flow / Omni Flash) or studio photography (Imagen / Nano Banana).
Mode: ${mode}
${styleInstruction}
${platformInstruction}
${ctaInstruction ? `Call to Action Instruction: ${ctaInstruction}` : ""}
Additional Creator Notes: ${extra || "None"}

Requirements for the generated prompt:
1. Accurately describe the subject based on visible features (colors, textures, materials, packaging, proportions).
2. Specify cinematic lighting (e.g. dramatic rim lighting, soft volumetric golden hour, diffused studio softbox).
3. Specify camera movement (e.g. smooth macro slow tracking shot, rotating pedestal 360, gentle push-in, static serene framing).
4. Specify ultra-high resolution keywords (e.g. 4k 60fps, photorealistic texture, octane render quality, film grain).
5. Output ONLY the finalized prompt text in English for maximum AI model fidelity. No introductory remarks, no quotes.`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: cleanB64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 300
            }
        };

        try {
            const data = await callGeminiGenerateContent(apiKey, requestBody);
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            return generatedText || generateFallbackPrompt(mode, style, platform, extra, ctaType, customCta);
        } catch (error) {
            console.error("[Gemini API Error]", error);
            const isInvalidKey = error.message?.toLowerCase().includes("api key not valid") || 
                                error.message?.toLowerCase().includes("invalid api key") ||
                                error.message?.toLowerCase().includes("api_key_invalid");

            if (isInvalidKey) {
                localStorage.removeItem("vidora_user_gemini_key");
                if (geminiKeyStatusBadge) {
                    geminiKeyStatusBadge.textContent = "Tidak Valid";
                    geminiKeyStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
                    geminiKeyStatusBadge.style.color = "#f87171";
                }
                const goToSettings = confirm(
                    `Peringatan: API Key Gemini Anda tidak valid atau telah kedaluwarsa di Google AI Studio.\n\n` +
                    `Pesan error: ${error.message}\n\n` +
                    `• Klik 'OK' untuk buka tab 'Pengaturan' dan masukkan API Key Gemini yang baru (gratis di aistudio.google.com)\n` +
                    `• Klik 'Cancel' untuk tetap generate prompt otomatis dengan Built-in Smart Engine.`
                );
                if (goToSettings) {
                    switchTab("accounts");
                    if (userGeminiKeyInput) {
                        userGeminiKeyInput.value = "";
                        userGeminiKeyInput.focus();
                    }
                }
                return generateFallbackPrompt(mode, style, platform, extra, ctaType, customCta);
            }

            alert(`Gagal menganalisa foto dengan Gemini: ${error.message}\n\nSistem otomatis mengaktifkan Smart Prompt VIDORA.`);
            return generateFallbackPrompt(mode, style, platform, extra, ctaType, customCta);
        }
    }

    // =========================================================================
    // 7.5 Storyboard 3-Scene & Hybrid Mode Engine
    // =========================================================================
    function updateStoryboardVisibility() {
        const isStoryboard = videoApStyleSelect?.value === "storyboard";

        if (wrapSinglePrompt && wrapStoryboardPrompt) {
            wrapSinglePrompt.style.display = isStoryboard ? "none" : "block";
            wrapStoryboardPrompt.style.display = isStoryboard ? "block" : "none";
        }

        if (btnGenerateVideo) {
            if (isStoryboard) {
                btnGenerateVideo.innerHTML = `<i data-lucide="film" style="width: 18px; height: 18px;"></i> <span>Generate Video Storyboard (3 Adegan)</span>`;
            } else {
                btnGenerateVideo.innerHTML = `<i data-lucide="play" style="width: 18px; height: 18px;"></i> <span>Generate Video</span>`;
            }
            if (window.lucide) lucide.createIcons();
        }
    }

    async function generateStoryboard3ScenesAndSeo({ platform = "tiktok", ctaType = "auto", customCta = "", base64Image = null, userPromptHint = "" }) {
        const platformDefaults = {
            tiktok: {
                scene1: "High-impact visual hook in first 2 seconds, rapid dynamic push-in onto featured subject, trending vibrant TikTok aesthetic, 4k 60fps.",
                scene2: "Extreme macro close-up showcasing product texture, smooth interaction and problem-solving demonstration, soft studio lighting.",
                scene3: "Energetic commercial hero display, shopping basket and discount ambiance, high-conversion visual framing pointing to yellow cart.",
                caption: "🔥 Gak nyangka nemu yang sebagus ini! Kualitasnya beneran premium dan bikin nagih banget 🤩✨ Cocok buat yang mau upgrade penampilan tanpa bikin kantong jebol.\n\n👇 Cek keranjang kuning di kiri bawah sekarang sebelum kehabisan promo hari ini!",
                hashtags: "#fyp #racuntiktok #tiktokshopindonesia #viralindonesia #rekomendasiproduk #racunbelanja #tiktokmademebuyit"
            },
            tiktok_aff: {
                scene1: "Unboxing curiosity hook, hands opening package with instant satisfying reveal, bright eye-catching TikTok Shop lighting.",
                scene2: "Step-by-step real usage demonstration, clear before-and-after texture comparison, authentic UGC perspective.",
                scene3: "Direct call-to-action hero angle with urgent discount badge, pointing finger gesture toward bottom-left yellow basket.",
                caption: "🚨 STOP SCROLL DULU! Ini dia yang lagi viral banget dan sering sold out! 😱 Mumpung lagi ready stock dan dapet gratis ongkir, langsung checkout sekarang ya!\n\n🛒 Klik keranjang kuning di bawah sebelum harga kembali normal!",
                hashtags: "#tiktokaffiliate #racuntiktok #racunbelanja #affiliatemarketing #tiktokshopid #fypシ゚viral"
            },
            shopee: {
                scene1: "Flashy dynamic commercial hook, vibrant colors, Shopee orange aesthetic with immediate product feature highlight.",
                scene2: "Detailed tactile demonstration, macro shot of craftsmanship, smooth rotating view revealing all angles.",
                scene3: "Shopee live-style closing shot, voucher discount banner ambiance, strong purchase callout.",
                caption: "✨ Yang dari kemarin nanyain spill barang ini, akhirnya restock juga! 😍 Kualitas juara dan lagi ada flash sale potongan gede banget!\n\n🛍️ Buruan klik keranjang oranye sekarang mumpung voucher diskon masih aktif!",
                hashtags: "#racunshopee #shopeehaul #spillracunshopee #shopeevideo #racunshopeecheck #shopeeid"
            },
            instagram: {
                scene1: "Cinematic moody slow push-in, luxury aesthetic, minimalist modern interior background, warm volumetric lighting.",
                scene2: "Elegant aesthetic product interaction, subtle camera panning, artistic depth of field, poetic indie film color grade.",
                scene3: "Minimalist hero still with soft rim glow, sophisticated typography headroom, calm aspirational atmosphere.",
                caption: "Elegance in simplicity. Sentuhan kecil yang bikin rutinitas harian jadi jauh lebih bermakna ✨🤍\n\n📌 Simpan reels ini untuk inspirasi kamu & tap link di bio untuk informasi pemesanan.",
                hashtags: "#reelsindonesia #aestheticlifestyle #dailyinspiration #minimalist #lifestylegoals #explorepage #aesthetic"
            },
            youtube: {
                scene1: "High-contrast visual hook with dramatic lighting, bold framing capturing curiosity in the first second.",
                scene2: "Fast-paced comprehensive product breakdown, showcasing key features and practical performance.",
                scene3: "Crisp closing shot with branded endcard space, dynamic subscribe and link in description visual cue.",
                caption: "Wajib tahu ini sebelum kehabisan! Rahasia kenapa produk ini viral dan dapat ribuan review positif 😱🔥\n\n👉 Cek info lengkap dan link promo di kolom komentar / deskripsi video!",
                hashtags: "#shorts #youtubeshorts #trending #review #viralindonesia #gadget #rekomendasi"
            }
        };

        const defaultData = platformDefaults[platform] || platformDefaults.tiktok;
        const apiKey = getUserGeminiKey();

        // 1. If Gemini API key is available, call Gemini 1.5 Flash Vision
        if (apiKey) {
            try {
                let cleanB64 = "";
                let mimeType = "image/jpeg";
                if (base64Image) {
                    if (base64Image.includes(";base64,")) {
                        const parts = base64Image.split(";base64,");
                        mimeType = parts[0].replace("data:", "");
                        cleanB64 = parts[1];
                    } else {
                        cleanB64 = base64Image;
                    }
                }

                const systemInstruction = `You are VIDORA Storyboard Director & Viral Copywriter.
Create a 3-Scene Video Storyboard and Platform SEO Copywriting.
Target Platform: ${platform}
CTA Requirement: ${ctaType} ${customCta ? `("${customCta}")` : ""}
User Description: ${userPromptHint || "Featured Commercial Product"}

You MUST return STRICTLY a valid JSON object (no markdown code fence, no text outside JSON):
{
  "scene1": "Adegan 1 Hook (0-3s): Vivid visual prompt in English for AI video generation...",
  "scene2": "Adegan 2 Demo & Detail (3-9s): Detailed close-up visual prompt in English...",
  "scene3": "Adegan 3 CTA & Closing (9-15s): High-converting closing visual prompt in English...",
  "caption": "Persuasive viral Indonesian copywriting caption with natural emojis, problem-solution hook, and strong CTA...",
  "hashtags": "8-10 trending viral SEO hashtags starting with #"
}`;

                const parts = [{ text: systemInstruction }];
                if (cleanB64) {
                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: cleanB64
                        }
                    });
                }

                const data = await callGeminiGenerateContent(apiKey, {
                    contents: [{ parts }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
                });
                    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
                    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed && (parsed.scene1 || parsed.caption)) {
                            return {
                                scene1: parsed.scene1 || defaultData.scene1,
                                scene2: parsed.scene2 || defaultData.scene2,
                                scene3: parsed.scene3 || defaultData.scene3,
                                caption: parsed.caption || defaultData.caption,
                                hashtags: parsed.hashtags || defaultData.hashtags
                            };
                        }
                    }
            } catch (err) {
                console.warn("[Storyboard Gemini fallback]", err);
                if (err.message?.toLowerCase().includes("api key not valid") || err.message?.toLowerCase().includes("invalid api key") || err.message?.toLowerCase().includes("api_key_invalid")) {
                    localStorage.removeItem("vidora_user_gemini_key");
                }
            }
        }

        // 2. Fallback to Pollinations AI text (Keyless, 100% Free)
        try {
            const queryPrompt = `Create a 3-scene video storyboard and Indonesian viral caption with SEO hashtags for ${platform}. Product/Subject: ${userPromptHint || "Commercial Product"}. Output valid JSON only: {"scene1":"Hook visual in English","scene2":"Product demo visual in English","scene3":"CTA visual in English","caption":"Indonesian viral caption","hashtags":"#tag1 #tag2"}`;
            const pollUrl = `https://text.pollinations.ai/${encodeURIComponent(queryPrompt)}`;
            const pollResp = await fetch(pollUrl);
            if (pollResp.ok) {
                let pollText = await pollResp.text();
                pollText = pollText.replace(/```json/gi, "").replace(/```/g, "").trim();
                const jsonMatch = pollText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed && (parsed.scene1 || parsed.caption)) {
                        return {
                            scene1: parsed.scene1 || defaultData.scene1,
                            scene2: parsed.scene2 || defaultData.scene2,
                            scene3: parsed.scene3 || defaultData.scene3,
                            caption: parsed.caption || defaultData.caption,
                            hashtags: parsed.hashtags || defaultData.hashtags
                        };
                    }
                }
            }
        } catch (pollErr) {
            console.warn("[Storyboard Pollinations fallback]", pollErr);
        }

        return defaultData;
    }

    async function triggerStoryboardAutoPrompt() {
        if (!checkSubscriptionAccess("Auto Prompt Video")) return;

        const btn = btnStoryboardAutoPrompt || btnVideoAutoPrompt;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Merancang 3 Adegan & SEO...</span>`;
            if (window.lucide) lucide.createIcons();
        }

        try {
            const platform = document.getElementById("videoPlatformSelect")?.value || "tiktok";
            const ctaType = document.getElementById("videoCtaSelect")?.value || "auto";
            const customCta = document.getElementById("videoCustomCta")?.value.trim() || "";
            const userPromptHint = (videoPromptInput?.value || sbScene1?.value || "").trim();

            const result = await generateStoryboard3ScenesAndSeo({
                platform,
                ctaType,
                customCta,
                base64Image: uploadedProductImage,
                userPromptHint
            });

            if (result) {
                if (sbScene1) sbScene1.value = result.scene1 || "";
                if (sbScene2) sbScene2.value = result.scene2 || "";
                if (sbScene3) sbScene3.value = result.scene3 || "";
                if (sbSeoText) {
                    sbSeoText.value = `${result.caption || ""}\n\n${result.hashtags || ""}`.trim();
                }
            }
        } catch (err) {
            console.error("Storyboard prompt error:", err);
            alert("Gagal merancang storyboard: " + err.message);
        } finally {
            if (btnStoryboardAutoPrompt) {
                btnStoryboardAutoPrompt.disabled = false;
                btnStoryboardAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto 3 Scene & SEO AI</span>`;
            }
            if (btnVideoAutoPrompt) {
                btnVideoAutoPrompt.disabled = false;
                btnVideoAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto Prompt AI</span>`;
            }
            if (window.lucide) lucide.createIcons();
        }
    }

    function loadImageFromSrc(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Gagal mengunduh gambar"));
            img.src = src;
        });
    }

    function renderImageToCinematicVideoBlob({ img, durationSec = 3.5, motionType = "hook_push", width = 720, height = 1280, fps = 30 }) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            let mimeType = "video/webm;codecs=vp9";
            if (typeof MediaRecorder === "undefined") {
                return reject(new Error("Browser Anda tidak mendukung MediaRecorder untuk mode Hybrid"));
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm;codecs=vp8";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/mp4";

            const stream = canvas.captureStream(fps);
            let recorder;
            try {
                recorder = new MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
                    videoBitsPerSecond: 3000000
                });
            } catch (_) {
                recorder = new MediaRecorder(stream);
            }

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
                resolve(blob);
            };
            recorder.onerror = (e) => reject(e);

            recorder.start();

            const startTime = performance.now();
            const totalMs = durationSec * 1000;

            function animate(now) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / totalMs);

                let scale = 1.0;
                let panX = 0;
                let panY = 0;

                if (motionType === "hook_push") {
                    const ease = Math.pow(progress, 0.45);
                    scale = 1.0 + ease * 0.18;
                    panY = Math.sin(progress * Math.PI) * 12;
                } else if (motionType === "pan_macro") {
                    scale = 1.12 + progress * 0.12;
                    panX = (progress - 0.5) * 35;
                    panY = (progress - 0.5) * 25;
                } else {
                    scale = 1.20 - progress * 0.15;
                    panY = (progress - 0.5) * 15;
                }

                ctx.save();
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, width, height);

                ctx.translate(width / 2, height / 2);
                ctx.scale(scale, scale);
                ctx.translate(panX, panY);

                const imgW = img.naturalWidth || img.width || width;
                const imgH = img.naturalHeight || img.height || height;
                const imgAspect = imgW / imgH;
                const canvasAspect = width / height;

                let drawW, drawH;
                if (imgAspect > canvasAspect) {
                    drawH = height;
                    drawW = height * imgAspect;
                } else {
                    drawW = width;
                    drawH = width / imgAspect;
                }

                ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

                if (motionType === "hook_push" && progress < 0.25) {
                    const flash = (1 - (progress / 0.25)) * 0.22;
                    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
                    ctx.fillRect(-drawW, -drawH, drawW * 2, drawH * 2);
                } else if (motionType === "cta_pull") {
                    const grad = ctx.createLinearGradient(0, height * 0.15, 0, height * 0.5);
                    grad.addColorStop(0, "rgba(245, 158, 11, 0)");
                    grad.addColorStop(1, "rgba(245, 158, 11, 0.12)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(-drawW, -drawH, drawW * 2, drawH * 2);
                }

                ctx.restore();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setTimeout(() => {
                        if (recorder.state !== "inactive") {
                            try { recorder.stop(); } catch (_) {}
                        }
                    }, 120);
                }
            }

            requestAnimationFrame(animate);
        });
    }

    async function generateHybridStoryboardClips({ scene1, scene2, scene3, targetRatio = "9:16", onProgress }) {
        const sceneDefs = [
            { text: scene1, name: "Scene 1: Hook (0-3s)", motion: "hook_push", duration: 3.5 },
            { text: scene2, name: "Scene 2: Demo Produk (3-9s)", motion: "pan_macro", duration: 4.5 },
            { text: scene3, name: "Scene 3: Closing & CTA (9-15s)", motion: "cta_pull", duration: 3.5 }
        ];

        let width = 720;
        let height = 1280;
        if (targetRatio === "16:9") {
            width = 1280;
            height = 720;
        } else if (targetRatio === "1:1") {
            width = 720;
            height = 720;
        }

        for (let i = 0; i < sceneDefs.length; i++) {
            const sc = sceneDefs[i];
            if (onProgress) onProgress(`Adegan ${i + 1}/3: Menyiapkan visual ${sc.name}...`);

            let imgElement = null;

            if (i === 1 && uploadedProductImage) {
                imgElement = await loadImageFromSrc(uploadedProductImage);
            } else {
                try {
                    const seed = Math.floor(Math.random() * 1000000);
                    const prompt = encodeURIComponent(`${sc.text}, cinematic lighting, photorealistic, 4k 60fps, high detail`);
                    const imgUrl = `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
                    imgElement = await loadImageFromSrc(imgUrl);
                } catch (e) {
                    console.warn(`Fallback image for scene ${i + 1}:`, e);
                    if (uploadedProductImage) {
                        imgElement = await loadImageFromSrc(uploadedProductImage);
                    } else {
                        throw new Error(`Visual Adegan ${i + 1} tidak dapat dimuat: ${e.message}`);
                    }
                }
            }

            if (onProgress) onProgress(`Adegan ${i + 1}/3: Merender gerakan sinematik (${sc.motion})...`);

            const blob = await renderImageToCinematicVideoBlob({
                img: imgElement,
                durationSec: sc.duration,
                motionType: sc.motion,
                width,
                height,
                fps: 30
            });

            await addClipToMixer(blob, sc.name);
        }
    }

    async function generateSingleHybridClip({ prompt, targetRatio = "9:16", onProgress }) {
        let width = 720;
        let height = 1280;
        if (targetRatio === "16:9") {
            width = 1280;
            height = 720;
        } else if (targetRatio === "1:1") {
            width = 720;
            height = 720;
        }

        if (onProgress) onProgress("Menyiapkan visual fotorealistik...");

        let imgElement = null;
        if (uploadedProductImage) {
            imgElement = await loadImageFromSrc(uploadedProductImage);
        } else {
            const seed = Math.floor(Math.random() * 1000000);
            const cleanPrompt = encodeURIComponent(`${prompt}, cinematic lighting, photorealistic, 4k 60fps, high detail`);
            const imgUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
            imgElement = await loadImageFromSrc(imgUrl);
        }

        if (onProgress) onProgress("Merender gerakan sinematik (Hybrid Engine)...");

        const blob = await renderImageToCinematicVideoBlob({
            img: imgElement,
            durationSec: 5.0,
            motionType: "hook_push",
            width,
            height,
            fps: 30
        });

        await addClipToMixer(blob, "Klip Video Hybrid");
    }

    // =========================================================================
    // 8. Auto Prompt Generation Handlers
    // =========================================================================
    btnVideoAutoPrompt.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Auto Prompt Video")) return;

        const style = document.getElementById("videoApStyleSelect")?.value || "musik_playlist";
        if (style === "storyboard") {
            await triggerStoryboardAutoPrompt();
            return;
        }

        if (!uploadedProductImage) {
            alert("Silakan upload foto produk terlebih dahulu di kotak upload di atas!");
            videoFileInput.click();
            return;
        }

        btnVideoAutoPrompt.disabled = true;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa Foto...</span>`;
        lucide.createIcons();

        const platform = document.getElementById("videoPlatformSelect")?.value || "youtube_long";
        const ctaType = document.getElementById("videoCtaSelect")?.value || "auto";
        const customCta = document.getElementById("videoCustomCta")?.value.trim() || "";

        const prompt = await analyzeProductImageWithGemini(
            uploadedProductImage, 
            "Commercial & Cinematic Video", 
            style, 
            platform, 
            "", 
            ctaType, 
            customCta
        );
        
        btnVideoAutoPrompt.disabled = false;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto Prompt AI</span>`;
        lucide.createIcons();

        if (prompt) {
            videoPromptInput.value = prompt;
            videoPromptInput.focus();
        }
    });

    btnImageAutoPrompt.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Auto Prompt Gambar")) return;

        if (!uploadedProductImage) {
            alert("Silakan upload foto produk referensi terlebih dahulu!");
            imageFileInput.click();
            return;
        }

        btnImageAutoPrompt.disabled = true;
        btnImageAutoPrompt.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa...</span>`;
        lucide.createIcons();

        const platform = document.getElementById("imagePlatformSelect")?.value || "marketplace";
        const prompt = await analyzeProductImageWithGemini(uploadedProductImage, "Product Studio Photography", selectedImageStyle || "studio", platform);
        
        btnImageAutoPrompt.disabled = false;
        btnImageAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto Prompt dari Foto</span>`;
        lucide.createIcons();

        if (prompt) {
            imagePromptInput.value = prompt;
            imagePromptInput.focus();
        }
    });

    btnRunPromptGen.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Generate Smart Prompt")) return;

        if (!uploadedProductImage) {
            alert("Silakan pilih/upload foto produk di tab Prompt Generator terlebih dahulu!");
            pgFileInput.click();
            return;
        }

        btnRunPromptGen.disabled = true;
        btnRunPromptGen.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Menganalisa Objek Produk...</span>`;
        lucide.createIcons();

        const mode = pgModeHidden ? pgModeHidden.value : "video";
        const style = pgStyleHidden ? pgStyleHidden.value : "hard_selling";
        const platform = pgPlatformSelect?.value || "youtube_long";
        const ctaType = document.getElementById("pgCtaSelect")?.value || "auto";
        const customCta = document.getElementById("pgCustomCta")?.value.trim() || "";
        const extra = pgExtraInput?.value.trim() || "";

        const prompt = await analyzeProductImageWithGemini(uploadedProductImage, mode, style, platform, extra, ctaType, customCta);

        btnRunPromptGen.disabled = false;
        btnRunPromptGen.innerHTML = `<i data-lucide="sparkles" style="width:18px;height:18px;"></i> <span>GENERATE SMART PROMPT AI</span>`;
        lucide.createIcons();

        if (prompt) {
            pgResultText.textContent = prompt;
            pgResultCard.style.display = "block";
            pgResultCard.scrollIntoView({ behavior: "smooth" });
        }
    });

    btnPgCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(pgResultText.textContent);
        alert("Prompt berhasil disalin ke clipboard!");
    });

    btnPgSendToVideo.addEventListener("click", () => {
        videoPromptInput.value = pgResultText.textContent;
        switchSubTab("video");
        videoPromptInput.focus();
    });

    btnPgSendToImage.addEventListener("click", () => {
        imagePromptInput.value = pgResultText.textContent;
        switchSubTab("image");
        imagePromptInput.focus();
    });

    // =========================================================================
    // 9. Generate Task Submission (Video & Image)
    // =========================================================================
    btnGenerateVideo.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Generate Video")) return;

        // Storyboard Mode (3 Adegan)
        if (videoApStyleSelect?.value === "storyboard") {
            const sc1 = (sbScene1?.value || "").trim();
            const sc2 = (sbScene2?.value || "").trim();
            const sc3 = (sbScene3?.value || "").trim();

            if (!sc1 && !sc2 && !sc3) {
                alert("Harap isi deskripsi adegan atau klik tombol 'Auto 3 Scene & SEO AI' terlebih dahulu!");
                if (sbScene1) sbScene1.focus();
                return;
            }

            btnGenerateVideo.disabled = true;
            btnGenerateVideo.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Memproses Video Storyboard...</span>`;
            if (window.lucide) lucide.createIcons();

            try {
                await generateHybridStoryboardClips({
                    scene1: sc1 || "Dynamic eye-catching visual hook, cinematic lighting, 4k",
                    scene2: sc2 || "Close-up product demonstration, showing textures and premium detail",
                    scene3: sc3 || "Call to action scene, premium product showcase with warm commercial glow",
                    targetRatio: videoRatio || "9:16",
                    onProgress: (msg) => {
                        btnGenerateVideo.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span style="font-size:12px;">${msg}</span>`;
                        if (window.lucide) lucide.createIcons();
                    }
                });

                btnGenerateVideo.disabled = false;
                btnGenerateVideo.innerHTML = `<i data-lucide="film" style="width: 18px; height: 18px;"></i> <span>Generate Video Storyboard (3 Adegan)</span>`;
                if (window.lucide) lucide.createIcons();

                switchTab("studio");
                switchSubTab("mixer");
                alert("🎉 Berhasil!\n\n3 Adegan Storyboard telah dibuat dan otomatis dimasukkan ke Antrian Mixer.\n\nSemua klip sudah tersusun berurutan (Scene 1, 2, 3). Anda bisa menambahkan musik latar, memilih transisi, dan klik 'Gabungkan Semua Klip Menjadi 1 Video'!");
            } catch (err) {
                console.error("Storyboard Generation Error:", err);
                btnGenerateVideo.disabled = false;
                btnGenerateVideo.innerHTML = `<i data-lucide="film" style="width: 18px; height: 18px;"></i> <span>Generate Video Storyboard (3 Adegan)</span>`;
                if (window.lucide) lucide.createIcons();
                alert("Gagal memproses Video Storyboard: " + err.message);
            }
            return;
        }

        // Single Video
        const prompt = videoPromptInput.value.trim();
        if (!prompt) {
            alert("Harap masukkan prompt video atau gunakan 'Auto Prompt AI' terlebih dahulu!");
            videoPromptInput.focus();
            return;
        }

        btnGenerateVideo.disabled = true;
        btnGenerateVideo.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Memproses Video...</span>`;
        if (window.lucide) lucide.createIcons();

        try {
            await generateSingleHybridClip({
                prompt,
                targetRatio: videoRatio || "9:16",
                onProgress: (msg) => {
                    btnGenerateVideo.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span style="font-size:12px;">${msg}</span>`;
                    if (window.lucide) lucide.createIcons();
                }
            });

            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="play" style="width: 18px; height: 18px;"></i> <span>Generate Video</span>`;
            if (window.lucide) lucide.createIcons();

            switchTab("studio");
            switchSubTab("mixer");
            alert("🎉 Berhasil!\n\nVideo telah dibuat dan otomatis dimasukkan ke Antrian Mixer.\n\nAnda dapat memutar video, menambahkan audio, atau menggabungkannya dengan klip lain!");
        } catch (err) {
            console.error("Single Video Generation Error:", err);
            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="play" style="width: 18px; height: 18px;"></i> <span>Generate Video</span>`;
            if (window.lucide) lucide.createIcons();
            alert("Gagal memproses Video: " + err.message);
        }
    });

    btnGenerateImage.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Generate Gambar")) return;

        const prompt = imagePromptInput.value.trim();
        if (!prompt) {
            alert("Harap masukkan prompt gambar atau gunakan 'Auto Prompt dari Foto'!");
            imagePromptInput.focus();
            return;
        }

        btnGenerateImage.disabled = true;
        btnGenerateImage.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Memproses Gambar...</span>`;
        if (window.lucide) lucide.createIcons();

        try {
            let width = 1024;
            let height = 1024;
            if (imageRatio === "9:16") {
                width = 720;
                height = 1280;
            } else if (imageRatio === "16:9") {
                width = 1280;
                height = 720;
            }

            const seed = Math.floor(Math.random() * 1000000);
            const style = selectedImageStyle || "studio";
            const cleanPrompt = encodeURIComponent(`${prompt}, ${style} photography, high resolution, 8k uhd, photorealistic, masterpiece`);
            const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

            await loadImageFromSrc(imageUrl);

            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="camera" style="width: 18px; height: 18px;"></i> <span>Generate Gambar</span>`;
            if (window.lucide) lucide.createIcons();

            openPlayerModal({
                url: imageUrl,
                title: prompt.substring(0, 40) + "...",
                type: "image"
            });
        } catch (e) {
            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="camera" style="width: 18px; height: 18px;"></i> <span>Generate Gambar</span>`;
            if (window.lucide) lucide.createIcons();
            alert("Gagal memproses gambar: " + e.message);
        }
    });

    // =========================================================================
    // 10. Accounts Management (Dinonaktifkan - Sistem 100% Bebas Akun Google)
    // =========================================================================
    async function refreshAccounts() {
        return;
    }

    // =========================================================================
    // 11. Queue & Gallery Sync
    // =========================================================================
    async function refreshJobs() {
        try {
            userJobs = (await window.vidoraData.getJobs()) || [];
        } catch (err) {
            console.warn("getJobs fallback:", err);
            userJobs = [];
        }

        // Render Antrian
        queueList.innerHTML = "";
        const activeJobs = userJobs.filter(j => j.status === "pending" || j.status === "processing");
        if (activeJobs.length === 0) {
            queueList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-tertiary);">
                    <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
                    <p>Tidak ada antrian berjalan saat ini.</p>
                </div>
            `;
        } else {
            activeJobs.forEach(job => {
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
                        ${!isImg ? `
                            <button type="button" class="btn-send-to-mixer" data-url="${job.video_url}" data-prompt="${encodeURIComponent(job.prompt)}" style="margin-top: 6px; padding: 5px 9px; font-size: 11px; background: linear-gradient(135deg, #ec4899, #be185d); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                                <i data-lucide="film" style="width: 12px; height: 12px;"></i>
                                <span>Kirim ke Video Mixer</span>
                            </button>
                        ` : ''}
                    </div>
                `;
                card.addEventListener("click", (e) => {
                    if (e.target.closest(".btn-send-to-mixer")) return;
                    openMediaModal(job);
                });
                galleryGrid.appendChild(card);
            });

            // Wire Kirim ke Mixer buttons
            galleryGrid.querySelectorAll(".btn-send-to-mixer").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const url = btn.getAttribute("data-url");
                    const title = decodeURIComponent(btn.getAttribute("data-prompt") || "Klip Video");
                    addClipToMixer(url, title);
                    switchTab("studio");
                    switchSubTab("mixer");
                    alert("Klip berhasil dikirim ke Video Mixer! Anda dapat menambahkan klip lain dan menggabungkannya.");
                });
            });
        }
        lucide.createIcons();
    }

    // Media Player Modal
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

    // =========================================================================
    // 12. Client-Side Video Mixer Engine
    // =========================================================================
    let mixerClips = []; // [{ id, url, name, duration, thumb }]
    let mixerAudioFile = null;
    let isMixing = false;

    const mixerDropzone = document.getElementById("mixerDropzone");
    const mixerFileInput = document.getElementById("mixerFileInput");
    const mixerClipsList = document.getElementById("mixerClipsList");
    const mixerEmptyHint = document.getElementById("mixerEmptyHint");
    const mixerClipCount = document.getElementById("mixerClipCount");
    const btnClearMixerClips = document.getElementById("btnClearMixerClips");
    const mixerRatioSelect = document.getElementById("mixerRatioSelect");
    const mixerTransitionSelect = document.getElementById("mixerTransitionSelect");
    const mixerAudioInput = document.getElementById("mixerAudioInput");
    const btnRemoveMixerAudio = document.getElementById("btnRemoveMixerAudio");
    const mixerAudioName = document.getElementById("mixerAudioName");
    const btnRunMixer = document.getElementById("btnRunMixer");
    const btnRunMixerText = document.getElementById("btnRunMixerText");
    const mixerProgressBox = document.getElementById("mixerProgressBox");
    const mixerStatusText = document.getElementById("mixerStatusText");
    const mixerProgressPct = document.getElementById("mixerProgressPct");
    const mixerProgressFill = document.getElementById("mixerProgressFill");
    const mixerResultBox = document.getElementById("mixerResultBox");
    const mixerResultVideo = document.getElementById("mixerResultVideo");
    const btnDownloadMixerResult = document.getElementById("btnDownloadMixerResult");
    const btnResetMixer = document.getElementById("btnResetMixer");

    async function addClipToMixer(source, name = "Klip Video") {
        const id = "clip_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        let url = "";

        if (source instanceof File || source instanceof Blob) {
            url = URL.createObjectURL(source);
        } else if (typeof source === "string") {
            try {
                if (source.startsWith("http")) {
                    const resp = await fetch(source, { mode: "cors" });
                    if (resp.ok) {
                        const blob = await resp.blob();
                        url = URL.createObjectURL(blob);
                    } else {
                        url = source;
                    }
                } else {
                    url = source;
                }
            } catch (_) {
                url = source;
            }
        }

        // Get metadata & generate thumbnail
        const v = document.createElement("video");
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.preload = "metadata";
        v.src = url;

        await new Promise(resolve => {
            v.onloadedmetadata = () => resolve();
            v.onerror = () => resolve();
            setTimeout(resolve, 3000);
        });

        const duration = isFinite(v.duration) && v.duration > 0 ? v.duration : 8;

        // Capture quick thumb
        let thumb = "";
        try {
            v.currentTime = Math.min(1, duration / 2);
            await new Promise(r => { v.onseeked = r; setTimeout(r, 600); });
            const c = document.createElement("canvas");
            c.width = 160;
            c.height = 160;
            const ctx = c.getContext("2d");
            ctx.drawImage(v, 0, 0, 160, 160);
            thumb = c.toDataURL("image/jpeg", 0.7);
        } catch (_) {
            thumb = "";
        }

        mixerClips.push({
            id,
            url,
            name: name || `Klip ${mixerClips.length + 1}`,
            duration: Math.round(duration * 10) / 10,
            thumb
        });

        renderMixerClips();
    }

    function renderMixerClips() {
        if (!mixerClipsList) return;
        mixerClipCount.textContent = mixerClips.length;

        if (mixerClips.length === 0) {
            mixerClipsList.innerHTML = `
                <div id="mixerEmptyHint" style="text-align: center; padding: 24px; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; color: var(--text-tertiary); font-size: 12px;">
                    Belum ada video yang dimasukkan. Tambahkan file di atas atau klik tombol <strong>"Kirim ke Video Mixer"</strong> pada galeri video.
                </div>
            `;
            return;
        }

        mixerClipsList.innerHTML = "";
        mixerClips.forEach((clip, index) => {
            const item = document.createElement("div");
            item.className = "account-item";
            item.style.alignItems = "center";
            item.style.gap = "10px";
            item.style.padding = "8px 12px";

            item.innerHTML = `
                <div style="font-size: 12px; font-weight: 800; color: #ec4899; width: 22px;">#${index + 1}</div>
                <div style="width: 44px; height: 44px; border-radius: 8px; background: black; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${clip.thumb ? `<img src="${clip.thumb}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i data-lucide="video" style="width: 18px; height: 18px; color: #64748b;"></i>`}
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 12.5px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${clip.name}
                    </div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">
                        Durasi: <strong>${clip.duration} detik</strong>
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn-icon btn-clip-up" data-idx="${index}" title="Naikkan" ${index === 0 ? 'disabled style="opacity:0.3"' : ''}>
                        <i data-lucide="arrow-up" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button type="button" class="btn-icon btn-clip-down" data-idx="${index}" title="Turunkan" ${index === mixerClips.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
                        <i data-lucide="arrow-down" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button type="button" class="btn-icon btn-clip-delete" data-idx="${index}" title="Hapus" style="color: #f87171;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            `;
            mixerClipsList.appendChild(item);
        });

        // Reorder buttons
        mixerClipsList.querySelectorAll(".btn-clip-up").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                if (idx > 0) {
                    const temp = mixerClips[idx];
                    mixerClips[idx] = mixerClips[idx - 1];
                    mixerClips[idx - 1] = temp;
                    renderMixerClips();
                }
            });
        });

        mixerClipsList.querySelectorAll(".btn-clip-down").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                if (idx < mixerClips.length - 1) {
                    const temp = mixerClips[idx];
                    mixerClips[idx] = mixerClips[idx + 1];
                    mixerClips[idx + 1] = temp;
                    renderMixerClips();
                }
            });
        });

        mixerClipsList.querySelectorAll(".btn-clip-delete").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                mixerClips.splice(idx, 1);
                renderMixerClips();
            });
        });

        lucide.createIcons();
    }

    // Mixer Dropzone & File Input
    if (mixerFileInput) {
        mixerFileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            for (const file of files) {
                await addClipToMixer(file, file.name);
            }
            mixerFileInput.value = "";
        });
    }

    if (mixerDropzone) {
        mixerDropzone.addEventListener("dragover", (e) => { 
            e.preventDefault(); 
            mixerDropzone.style.borderColor = "#ec4899"; 
            mixerDropzone.style.background = "rgba(236,72,153,0.1)"; 
        });
        mixerDropzone.addEventListener("dragleave", () => { 
            mixerDropzone.style.borderColor = "rgba(236,72,153,0.45)"; 
            mixerDropzone.style.background = "rgba(0,0,0,0.2)"; 
        });
        mixerDropzone.addEventListener("drop", async (e) => {
            e.preventDefault();
            mixerDropzone.style.borderColor = "rgba(236,72,153,0.45)";
            mixerDropzone.style.background = "rgba(0,0,0,0.2)";
            const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name));
            for (const file of files) {
                await addClipToMixer(file, file.name);
            }
        });
    }

    if (btnClearMixerClips) {
        btnClearMixerClips.addEventListener("click", () => {
            if (mixerClips.length > 0 && confirm("Kosongkan semua klip di mixer?")) {
                mixerClips = [];
                renderMixerClips();
            }
        });
    }

    // Mixer Audio Input
    if (mixerAudioInput) {
        mixerAudioInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                mixerAudioFile = file;
                mixerAudioName.textContent = `🎵 Backsound: ${file.name}`;
                mixerAudioName.style.display = "block";
                btnRemoveMixerAudio.style.display = "inline-flex";
            }
        });
    }

    if (btnRemoveMixerAudio) {
        btnRemoveMixerAudio.addEventListener("click", () => {
            mixerAudioFile = null;
            mixerAudioInput.value = "";
            mixerAudioName.style.display = "none";
            btnRemoveMixerAudio.style.display = "none";
        });
    }

    if (btnResetMixer) {
        btnResetMixer.addEventListener("click", () => {
            mixerResultBox.style.display = "none";
            mixerProgressBox.style.display = "none";
            if (mixerResultVideo) mixerResultVideo.src = "";
        });
    }

    // Execute Video Mixer Concatenation
    if (btnRunMixer) {
        btnRunMixer.addEventListener("click", async () => {
            if (isMixing) return;
            if (mixerClips.length < 2) {
                alert("Masukkan minimal 2 klip video untuk digabungkan!");
                return;
            }

            isMixing = true;
            btnRunMixer.disabled = true;
            btnRunMixerText.textContent = "SEDANG MENGGABUNGKAN...";
            mixerProgressBox.style.display = "block";
            mixerResultBox.style.display = "none";

            // Resolution according to ratio
            const ratio = mixerRatioSelect?.value || "9:16";
            let outW = 720;
            let outH = 1280;
            if (ratio === "16:9") { outW = 1280; outH = 720; }
            if (ratio === "1:1") { outW = 720; outH = 720; }

            const canvas = document.createElement("canvas");
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext("2d");

            // Audio Context & Destination
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            if (audioCtx.state === "suspended") {
                try { await audioCtx.resume(); } catch (_) {}
            }
            const audioDest = audioCtx.createMediaStreamDestination();

            // Background Audio if provided
            let bgmElem = null;
            if (mixerAudioFile) {
                bgmElem = document.createElement("audio");
                bgmElem.src = URL.createObjectURL(mixerAudioFile);
                bgmElem.loop = true;
                try {
                    const bgmSource = audioCtx.createMediaElementSource(bgmElem);
                    const bgmGain = audioCtx.createGain();
                    bgmGain.gain.value = 0.6; // 60% volume
                    bgmSource.connect(bgmGain).connect(audioDest);
                    bgmElem.play().catch(() => {});
                } catch (_) {}
            }

            // Stream & MediaRecorder
            const canvasStream = canvas.captureStream(30);
            const combinedTracks = [
                ...canvasStream.getVideoTracks(),
                ...audioDest.stream.getAudioTracks()
            ];
            const mixedStream = new MediaStream(combinedTracks);

            const mimeTypes = [
                "video/webm;codecs=vp9,opus",
                "video/webm;codecs=vp8,opus",
                "video/webm"
            ];
            let supportedMime = "video/webm";
            for (const m of mimeTypes) {
                if (MediaRecorder.isTypeSupported(m)) {
                    supportedMime = m;
                    break;
                }
            }

            const recorder = new MediaRecorder(mixedStream, { mimeType: supportedMime });
            const recordedChunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recordedChunks.push(e.data);
            };

            recorder.start(100);

            const totalDuration = mixerClips.reduce((sum, c) => sum + (c.duration || 5), 0);
            let elapsedTotal = 0;
            const transitionType = mixerTransitionSelect?.value || "cut";

            // Process each clip sequentially
            for (let i = 0; i < mixerClips.length; i++) {
                const clip = mixerClips[i];
                mixerStatusText.textContent = `Memproses klip ${i + 1} dari ${mixerClips.length}: "${clip.name}"...`;

                const v = document.createElement("video");
                v.playsInline = true;
                v.setAttribute("playsinline", "");
                v.crossOrigin = "anonymous";
                v.src = clip.url;
                v.muted = false;

                // Connect video audio to destination
                try {
                    const vSource = audioCtx.createMediaElementSource(v);
                    vSource.connect(audioDest);
                } catch (_) {}

                await new Promise(resolve => {
                    v.oncanplay = () => resolve();
                    v.onerror = () => resolve();
                    setTimeout(resolve, 3000);
                });

                try {
                    await v.play();
                } catch (playErr) {
                    console.warn("Autoplay with audio blocked, fallback to muted:", playErr);
                    v.muted = true;
                    try { await v.play(); } catch (_) {}
                }

                // Play clip and draw to canvas with wall-clock timer fallback
                await new Promise(resolve => {
                    const clipDuration = (isFinite(v.duration) && v.duration > 0) ? v.duration : (clip.duration || 5);
                    const clipStartTime = performance.now();

                    const renderFrame = () => {
                        if (!isMixing) { resolve(); return; }

                        const elapsedInClip = (performance.now() - clipStartTime) / 1000;
                        if (v.paused && v.currentTime < clipDuration) {
                            try { v.currentTime = Math.min(clipDuration, elapsedInClip); } catch (_) {}
                        }
                        const curTime = (v.currentTime && v.currentTime > 0) ? v.currentTime : elapsedInClip;

                        ctx.fillStyle = "#000000";
                        ctx.fillRect(0, 0, outW, outH);

                        // Letterbox / contain scaling
                        const vw = v.videoWidth || outW;
                        const vh = v.videoHeight || outH;
                        const scale = Math.min(outW / vw, outH / vh);
                        const dw = vw * scale;
                        const dh = vh * scale;
                        const dx = (outW - dw) / 2;
                        const dy = (outH - dh) / 2;

                        // Optional fade transition at start/end
                        let alpha = 1;
                        if (transitionType === "fade") {
                            if (curTime < 0.4) {
                                alpha = Math.min(1, curTime / 0.4);
                            } else if (clipDuration - curTime < 0.4) {
                                alpha = Math.min(1, (clipDuration - curTime) / 0.4);
                            }
                        }
                        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                        try {
                            ctx.drawImage(v, dx, dy, dw, dh);
                        } catch (_) {}
                        ctx.globalAlpha = 1.0;

                        // Progress
                        const currentGlobal = elapsedTotal + curTime;
                        const pct = Math.min(99, Math.round((currentGlobal / totalDuration) * 100));
                        mixerProgressPct.textContent = `${pct}%`;
                        mixerProgressFill.style.width = `${pct}%`;

                        if (v.ended || curTime >= clipDuration || elapsedInClip >= clipDuration + 0.5) {
                            elapsedTotal += clipDuration;
                            resolve();
                        } else {
                            requestAnimationFrame(renderFrame);
                        }
                    };

                    requestAnimationFrame(renderFrame);
                });

                v.pause();
                v.src = "";
            }

            // Stop BGM if running
            if (bgmElem) {
                bgmElem.pause();
                bgmElem.src = "";
            }

            // Finish Recording
            mixerStatusText.textContent = "Menyelesaikan penyatuan file video...";
            mixerProgressPct.textContent = "100%";
            mixerProgressFill.style.width = "100%";

            await new Promise(resolve => setTimeout(resolve, 800));

            recorder.onstop = () => {
                const finalBlob = new Blob(recordedChunks, { type: supportedMime });
                const finalUrl = URL.createObjectURL(finalBlob);

                mixerResultVideo.src = finalUrl;
                btnDownloadMixerResult.href = finalUrl;
                btnDownloadMixerResult.download = `vidora-mixed-${ratio.replace(':', 'x')}-${Date.now()}.webm`;

                mixerProgressBox.style.display = "none";
                mixerResultBox.style.display = "block";
                mixerResultBox.scrollIntoView({ behavior: "smooth" });

                btnRunMixer.disabled = false;
                btnRunMixerText.textContent = "GABUNGKAN SEMUA VIDEO";
                isMixing = false;
                lucide.createIcons();
            };

            recorder.stop();
        });
    }

    window.vidoraData.subscribeJobs(() => {
        refreshJobs();
    });

    // Run Init
    await initApp();

    // Check URL parameters for direct action
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get("plan");
    const tabParam = urlParams.get("tab");
    const subParam = urlParams.get("sub");
    const authParam = urlParams.get("auth");
    const statusParam = urlParams.get("status");
    const orderIdParam = urlParams.get("order_id");

    // Pakasir QRIS Payment Success Handler
    if (statusParam === "success" && orderIdParam) {
        setTimeout(() => {
            alert(`🎉 PEMBAYARAN QRIS PAKASIR BERHASIL!\n\nNo. Invoice: ${orderIdParam}\nStatus: LUNAS\n\nAkun Creator Pass (5 Profil Google) Anda telah AKTIF secara otomatis. Selamat berkarya di VIDORA Studio!`);
        }, 500);

        if (activeProfile) {
            activeProfile.is_subscribed = true;
            if (activeProfile.role !== "superadmin") {
                activeProfile.max_google_accounts = 5;
            }
            if (subWarningBanner) subWarningBanner.style.display = "none";
            updateHeaderUI();
        }

        // Clean up URL query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authParam === "login" || authParam === "signup") {
        modalAuth.classList.add("open");
        if (authParam === "signup") {
            const btnSignUpTab = document.getElementById("btnTabSignUp");
            if (btnSignUpTab) btnSignUpTab.click();
        }
    }

    if (planParam) {
        openCheckoutModal(planParam);
    }
    if (tabParam) {
        switchTab(tabParam);
    }
    if (subParam && subviews[subParam]) {
        switchSubTab(subParam);
    } else if (window.location.hash === "#mixer") {
        switchTab("studio");
        switchSubTab("mixer");
    }

    // Storyboard Event Listeners & Initial State
    if (videoApStyleSelect) {
        videoApStyleSelect.addEventListener("change", updateStoryboardVisibility);
    }
    if (btnStoryboardAutoPrompt) {
        btnStoryboardAutoPrompt.addEventListener("click", async () => {
            await triggerStoryboardAutoPrompt();
        });
    }
    if (btnCopySbSeo) {
        btnCopySbSeo.addEventListener("click", () => {
            const text = sbSeoText?.value || "";
            if (!text.trim()) {
                alert("Belum ada caption & hashtag. Klik 'Auto 3 Scene & SEO AI' terlebih dahulu!");
                return;
            }
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = btnCopySbSeo.innerHTML;
                btnCopySbSeo.innerHTML = `<i data-lucide="check" style="width:12px;height:12px;"></i> <span>Tersalin!</span>`;
                if (window.lucide) lucide.createIcons();
                setTimeout(() => {
                    btnCopySbSeo.innerHTML = originalHTML;
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }).catch(() => {
                sbSeoText.select();
                document.execCommand("copy");
                alert("Caption & Hashtags berhasil disalin!");
            });
        });
    }
    updateStoryboardVisibility();
});

