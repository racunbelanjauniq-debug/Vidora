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
        const session = await window.vidoraData.getSession();
        currentUser = session?.user || null;
        activeProfile = session?.profile || { role: "user", max_google_accounts: 5, is_subscribed: false };

        const btnCloseAuth = document.getElementById("btnCloseAuth");

        if (!currentUser) {
            // STRICT AUTH GUARD: Belum login, alihkan langsung ke halaman login
            window.location.replace("login");
            return;
        }

        // Proteksi Tab Admin -> Alihkan langsung ke Dedicated Super Admin Portal
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("tab") === "admin") {
            if (activeProfile.role === "superadmin" || activeProfile.role === "admin") {
                window.location.replace("/admin");
                return;
            } else {
                alert("Akses Terbatas: Hanya Super Admin yang dapat mengakses panel ini.");
                window.location.replace("/admin/login");
                return;
            }
        }

        updateHeaderUI();
        await refreshAccounts();
        await refreshJobs();

        // Non-Member notification & banner
        const isSub = isUserSubscribed();
        if (subWarningBanner) {
            subWarningBanner.style.display = isSub ? "none" : "flex";
        }
        if (!isSub) {
            // Tampilkan popup otomatis saat non-member masuk sesuai instruksi:
            // "jika seseorang masuk kesini non member pastikan tidak bisa melakukan generate dan muncul popup anda belum berlangganan"
            setTimeout(() => {
                openSubscriptionRequiredModal("Akses Studio AI Generator");
            }, 600);
        }

        // Check connection pill in admin tab
        updateConnectionStatusPill();
    }

    function updateHeaderUI() {
        if (!currentUser) {
            btnHeaderAuth.style.display = "inline-flex";
            userRoleBadge.style.display = "none";
            navItemAdmin.style.display = "none";
        } else {
            btnHeaderAuth.style.display = "none";
            userRoleBadge.style.display = "inline-flex";

            if (activeProfile.role === "admin" || activeProfile.role === "superadmin") {
                userRoleBadge.innerHTML = `<i data-lucide="crown" style="width:13px;height:13px;color:#fbbf24;"></i> <span id="userRoleText">Super Admin</span>`;
                userRoleBadge.style.borderColor = "rgba(251, 191, 36, 0.4)";
                userRoleBadge.style.color = "#fef08a";
                userRoleBadge.style.background = "rgba(251, 191, 36, 0.15)";
                userRoleBadge.style.cursor = "pointer";
                userRoleBadge.title = "Buka Portal Super Admin";
                userRoleBadge.onclick = () => { window.location.href = "/admin"; };
                navItemAdmin.style.display = "flex";
                navItemAdmin.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = "/admin";
                };
            } else if (isUserSubscribed()) {
                userRoleBadge.innerHTML = `<i data-lucide="check-circle" style="width:13px;height:13px;color:#10b981;"></i> <span id="userRoleText">${activeProfile.full_name || 'Member'} (Aktif)</span>`;
                userRoleBadge.style.borderColor = "rgba(16, 185, 129, 0.35)";
                userRoleBadge.style.color = "#a7f3d0";
                userRoleBadge.style.background = "rgba(16, 185, 129, 0.12)";
                navItemAdmin.style.display = "none";
            } else {
                userRoleBadge.innerHTML = `<i data-lucide="alert-triangle" style="width:13px;height:13px;color:#fbbf24;"></i> <span id="userRoleText">${activeProfile.full_name || 'Member'} (Belum Langganan)</span>`;
                userRoleBadge.style.borderColor = "rgba(245, 158, 11, 0.4)";
                userRoleBadge.style.color = "#fde68a";
                userRoleBadge.style.background = "rgba(245, 158, 11, 0.12)";
                navItemAdmin.style.display = "none";
            }
        }
        lucide.createIcons();
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
    btnHeaderAuth.addEventListener("click", () => {
        modalAuth.classList.add("open");
    });

    userRoleBadge.addEventListener("click", () => {
        if (!currentUser) {
            modalAuth.classList.add("open");
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

    if (btnHeaderAuth) {
        btnHeaderAuth.addEventListener("click", () => {
            modalAuth.classList.add("open");
        });
    }

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

        // Prefill name & email if logged in
        if (currentUser) {
            document.getElementById("coCustomerName").value = activeProfile?.full_name || "";
            document.getElementById("coCustomerEmail").value = currentUser.email || "";
        }
    }

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
                const redirectTarget = window.location.origin + "/app.html?order_id=" + order.id + "&status=success";
                const pakasirPayUrl = `https://app.pakasir.com/pay/${slug}/${planPrice}?order_id=${order.id}&redirect=${encodeURIComponent(redirectTarget)}`;

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
    // 7. BYOK: Gemini API Key Handling (Browser LocalStorage)
    // =========================================================================
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

    // Gemini Vision API Caller (GAMA PRO Engine)
    async function analyzeProductImageWithGemini(base64Data, mode, style, platform, extra = "", ctaType = "auto", customCta = "") {
        const apiKey = getUserGeminiKey();
        if (!apiKey) {
            alert("Perhatian: Anda belum memasukkan API Key Gemini!\n\nSilakan masukkan API Key Gemini Anda di tab 'Akun' terlebih dahulu agar AI bisa membaca foto produk Anda.");
            switchTab("accounts");
            userGeminiKeyInput.focus();
            return null;
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

        // Full 17 GAMA PRO style instruction map
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

        const systemPrompt = `You are VIDORA Smart Prompt Generator (powered by GAMA PRO Engine), an elite commercial director, cinematographer, and prompt engineer.
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

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            return generatedText || null;
        } catch (error) {
            console.error("[Gemini API Error]", error);
            alert(`Gagal menganalisa foto dengan Gemini: ${error.message}\n\nPastikan API Key Gemini Anda valid.`);
            return null;
        }
    }

    // =========================================================================
    // 8. Auto Prompt Generation Handlers
    // =========================================================================
    btnVideoAutoPrompt.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Auto Prompt Video")) return;

        if (!uploadedProductImage) {
            alert("Silakan upload foto produk terlebih dahulu di kotak upload di atas!");
            videoFileInput.click();
            return;
        }

        btnVideoAutoPrompt.disabled = true;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa Foto...</span>`;
        lucide.createIcons();

        const platform = document.getElementById("videoPlatformSelect")?.value || "youtube_long";
        const style = document.getElementById("videoApStyleSelect")?.value || "musik_playlist";
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
        btnRunPromptGen.innerHTML = `<i data-lucide="sparkles" style="width:18px;height:18px;"></i> <span>GENERATE SMART PROMPT (GAMA PRO ENGINE)</span>`;
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
        if (!checkSubscriptionAccess("Generate Video AI (Omni Flash)")) return;

        const prompt = videoPromptInput.value.trim();
        if (!prompt) {
            alert("Harap masukkan prompt video atau gunakan 'Auto Prompt dari Foto' terlebih dahulu!");
            videoPromptInput.focus();
            return;
        }

        const accId = videoAccountSelect.value;
        btnGenerateVideo.disabled = true;
        btnGenerateVideo.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Mengirim ke Antrian...</span>`;
        lucide.createIcons();

        try {
            await window.vidoraData.createGenerateJob({
                prompt,
                model: "Omni Flash",
                ratio: videoRatio,
                duration: videoDuration,
                count: 1,
                googleAccountId: accId || null,
                hidden: true
            });

            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="zap" style="width: 18px; height: 18px;"></i> <span>Generate Video (Omni Flash)</span>`;
            lucide.createIcons();

            switchTab("queue");
            refreshJobs();
        } catch (e) {
            btnGenerateVideo.disabled = false;
            btnGenerateVideo.innerHTML = `<i data-lucide="zap" style="width: 18px; height: 18px;"></i> <span>Generate Video (Omni Flash)</span>`;
            lucide.createIcons();
            alert("Gagal membuat tugas antrian: " + e.message);
        }
    });

    btnGenerateImage.addEventListener("click", async () => {
        if (!checkSubscriptionAccess("Generate Gambar Produk (Nano Banana)")) return;

        const prompt = imagePromptInput.value.trim();
        if (!prompt) {
            alert("Harap masukkan prompt gambar atau gunakan 'Auto Prompt dari Foto'!");
            imagePromptInput.focus();
            return;
        }

        const accId = imageAccountSelect.value;
        const count = parseInt(document.getElementById("imageCountSelect").value) || 1;

        btnGenerateImage.disabled = true;
        btnGenerateImage.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Mengirim ke Antrian...</span>`;
        lucide.createIcons();

        try {
            await window.vidoraData.createGenerateJob({
                prompt,
                model: "Nano Banana",
                ratio: imageRatio,
                duration: "photo",
                count: count,
                googleAccountId: accId || null,
                hidden: true
            });

            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="sparkles" style="width: 18px; height: 18px;"></i> <span>Generate Gambar Produk</span>`;
            lucide.createIcons();

            switchTab("queue");
            refreshJobs();
        } catch (e) {
            btnGenerateImage.disabled = false;
            btnGenerateImage.innerHTML = `<i data-lucide="sparkles" style="width: 18px; height: 18px;"></i> <span>Generate Gambar Produk</span>`;
            lucide.createIcons();
            alert("Gagal membuat tugas antrian: " + e.message);
        }
    });

    // =========================================================================
    // 10. Accounts Management
    // =========================================================================
    const btnAddAccount = document.getElementById("btnAddAccount");
    const btnCloseAddAccount = document.getElementById("btnCloseAddAccount");
    const formAddAccount = document.getElementById("formAddAccount");
    const newAccountEmail = document.getElementById("newAccountEmail");
    const newAccountLabel = document.getElementById("newAccountLabel");

    btnAddAccount.addEventListener("click", () => {
        if (!checkSubscriptionAccess("Tambah Akun Google")) return;

        const limit = activeProfile?.max_google_accounts || 5;
        if (activeProfile?.role !== "superadmin" && userAccounts.length >= limit) {
            if (confirm(`Batas kuota ${limit} akun Google tercapai!\n\nIngin upgrade ke paket Pro / Agency untuk menambah slot akun?`)) {
                openCheckoutModal("pro");
            }
            return;
        }
        modalAddAccount.classList.add("open");
    });

    btnCloseAddAccount.addEventListener("click", () => {
        modalAddAccount.classList.remove("open");
    });

    formAddAccount.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = newAccountEmail.value.trim();
        const label = newAccountLabel.value.trim();

        if (!email) return;

        try {
            await window.vidoraData.addGoogleAccount(email, label);
            newAccountEmail.value = "";
            newAccountLabel.value = "";
            modalAddAccount.classList.remove("open");
            await refreshAccounts();
            alert(`Akun Google ${email} berhasil didaftarkan ke vault!`);
        } catch (err) {
            alert(err.message);
        }
    });

    async function refreshAccounts() {
        userAccounts = await window.vidoraData.getGoogleAccounts();

        // Update dropdowns
        const updateDropdown = (selectElem) => {
            if (!selectElem) return;
            const currentVal = selectElem.value;
            selectElem.innerHTML = `<option value="">-- Rotasi Otomatis Semua Akun Aktif (${userAccounts.length} Akun) --</option>`;
            userAccounts.forEach(acc => {
                const opt = document.createElement("option");
                opt.value = acc.id;
                opt.textContent = `${acc.email} (${acc.label || 'Akun'}) - ${acc.credit_status === 'ready' ? 'Siap' : 'Cooldown'}`;
                selectElem.appendChild(opt);
            });
            selectElem.value = currentVal;
        };

        updateDropdown(videoAccountSelect);
        updateDropdown(imageAccountSelect);

        // Update Quota limits bar
        const limit = activeProfile?.max_google_accounts || 5;
        if (activeProfile?.role === "superadmin") {
            accountLimitText.textContent = `${userAccounts.length} / Unlimited (Super Admin)`;
            accountLimitFill.style.width = "100%";
            accountLimitFill.style.background = "#fbbf24";
        } else {
            accountLimitText.textContent = `${userAccounts.length} / ${limit} Akun`;
            const pct = Math.min(100, Math.round((userAccounts.length / limit) * 100));
            accountLimitFill.style.width = `${pct}%`;
            accountLimitFill.style.background = pct >= 100 ? "#f43f5e" : "var(--primary)";
        }

        // Render List
        accountsList.innerHTML = "";
        if (userAccounts.length === 0) {
            accountsList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-tertiary);">
                    <i data-lucide="user-plus" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
                    <p>Belum ada akun Google terdaftar. Ketuk "+ Tambah Akun Google" di atas.</p>
                </div>
            `;
        } else {
            userAccounts.forEach(acc => {
                const item = document.createElement("div");
                item.className = "account-item";
                item.innerHTML = `
                    <div class="account-info">
                        <div class="account-email">${acc.email}</div>
                        <div class="account-meta">
                            <span>${acc.label || 'Google Flow Profile'}</span> &bull; 
                            <span style="color: ${acc.credit_status === 'ready' ? '#10b981' : '#f59e0b'};">
                                ${acc.credit_status === 'ready' ? '● Siap Generate' : '● Cooldown'}
                            </span>
                        </div>
                    </div>
                    <button type="button" class="btn-remove-account" data-id="${acc.id}" title="Hapus Akun">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                `;
                accountsList.appendChild(item);
            });

            // Wire delete buttons
            document.querySelectorAll(".btn-remove-account").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const accId = btn.getAttribute("data-id");
                    if (confirm("Hapus akun Google ini dari VIDORA?")) {
                        await window.vidoraData.deleteGoogleAccount(accId);
                        await refreshAccounts();
                    }
                });
            });
        }
        lucide.createIcons();
    }

    // =========================================================================
    // 11. Queue & Gallery Sync
    // =========================================================================
    async function refreshJobs() {
        userJobs = await window.vidoraData.getJobs();

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

        if (source instanceof File) {
            url = URL.createObjectURL(source);
        } else if (typeof source === "string") {
            url = source;
        }

        // Get metadata & generate thumbnail
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
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
    if (mixerDropzone && mixerFileInput) {
        mixerDropzone.addEventListener("click", () => mixerFileInput.click());
        mixerDropzone.addEventListener("dragover", (e) => { e.preventDefault(); mixerDropzone.style.borderColor = "#ec4899"; });
        mixerDropzone.addEventListener("dragleave", () => { mixerDropzone.style.borderColor = "rgba(236,72,153,0.35)"; });
        mixerDropzone.addEventListener("drop", async (e) => {
            e.preventDefault();
            mixerDropzone.style.borderColor = "rgba(236,72,153,0.35)";
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("video/"));
            for (const file of files) {
                await addClipToMixer(file, file.name);
            }
        });

        mixerFileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await addClipToMixer(file, file.name);
            }
            mixerFileInput.value = "";
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
            const audioDest = audioCtx.createMediaStreamDestination();

            // Background Audio if provided
            let bgmElem = null;
            if (mixerAudioFile) {
                bgmElem = document.createElement("audio");
                bgmElem.src = URL.createObjectURL(mixerAudioFile);
                bgmElem.loop = true;
                const bgmSource = audioCtx.createMediaElementSource(bgmElem);
                const bgmGain = audioCtx.createGain();
                bgmGain.gain.value = 0.6; // 60% volume
                bgmSource.connect(bgmGain).connect(audioDest);
                bgmElem.play().catch(() => {});
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
                    setTimeout(resolve, 4000);
                });

                await v.play().catch(() => {});

                // Play clip and draw to canvas
                await new Promise(resolve => {
                    const clipDuration = v.duration || clip.duration || 5;

                    const renderFrame = () => {
                        if (!isMixing) { resolve(); return; }

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
                            if (v.currentTime < 0.4) {
                                alpha = Math.min(1, v.currentTime / 0.4);
                            } else if (clipDuration - v.currentTime < 0.4) {
                                alpha = Math.min(1, (clipDuration - v.currentTime) / 0.4);
                            }
                        }
                        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                        ctx.drawImage(v, dx, dy, dw, dh);
                        ctx.globalAlpha = 1.0;

                        // Progress
                        const currentGlobal = elapsedTotal + v.currentTime;
                        const pct = Math.min(99, Math.round((currentGlobal / totalDuration) * 100));
                        mixerProgressPct.textContent = `${pct}%`;
                        mixerProgressFill.style.width = `${pct}%`;

                        if (v.ended || v.currentTime >= clipDuration) {
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
});

