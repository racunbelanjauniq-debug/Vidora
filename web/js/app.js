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

    // Modals
    const modalAddAccount = document.getElementById("modalAddAccount");
    const modalVideoPlayer = document.getElementById("modalVideoPlayer");
    const modalAuth = document.getElementById("modalAuth");
    const modalUserProfile = document.getElementById("modalUserProfile");
    const modalCheckout = document.getElementById("modalCheckout");
    const playerVideo = document.getElementById("playerVideo");
    const playerImage = document.getElementById("playerImage");
    const playerPromptText = document.getElementById("playerPromptText");
    const playerModalTitle = document.getElementById("playerModalTitle");
    const btnDownloadVideo = document.getElementById("btnDownloadVideo");

    // =========================================================================
    // 1. Initial Load & Auth Sync
    // =========================================================================
    async function initApp() {
        const session = await window.vidoraData.getSession();
        currentUser = session?.user || null;
        activeProfile = session?.profile || { role: "user", max_google_accounts: 5 };

        updateHeaderUI();
        await refreshAccounts();
        await refreshJobs();

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
                navItemAdmin.style.display = "flex";
            } else {
                userRoleBadge.innerHTML = `<i data-lucide="user" style="width:13px;height:13px;"></i> <span id="userRoleText">${activeProfile.full_name || 'Member'}</span>`;
                userRoleBadge.style.borderColor = "rgba(255, 255, 255, 0.1)";
                userRoleBadge.style.color = "var(--text-secondary)";
                userRoleBadge.style.background = "rgba(255, 255, 255, 0.04)";
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

        if (activeProfile.role === "superadmin") {
            badgeElem.className = "role-badge-admin";
            badgeElem.textContent = "Super Admin";
            limitElem.textContent = "Unlimited Akun";
        } else {
            badgeElem.className = "role-badge-user";
            badgeElem.textContent = "Member Pro";
            limitElem.textContent = `Maks ${activeProfile.max_google_accounts || 5} Akun`;
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

    // Guest / Demo continue
    document.getElementById("btnContinueGuest").addEventListener("click", async () => {
        window.vidoraData.resetDemoUser("user");
        modalAuth.classList.remove("open");
        await initApp();
    });

    // Sign Out
    document.getElementById("btnSignOut").addEventListener("click", async () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            await window.vidoraData.signOut();
            modalUserProfile.classList.remove("open");
            await initApp();
            switchTab("studio");
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
            
            // Trigger automatic WhatsApp notification via xsender.id
            if (window.xsender) {
                window.xsender.notifyOrderPlaced(order).catch(err => console.warn("[Xsender] Gagal kirim notif order:", err));
            }

            // Activate Creator Pass with strictly 5 accounts max
            if (activeProfile) {
                if (activeProfile.role !== "superadmin") {
                    activeProfile.role = "user";
                    activeProfile.max_google_accounts = 5;
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
    async function renderAdminUsers() {
        const tbody = document.getElementById("adminUsersTableBody");
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Memuat data pengguna...</td></tr>`;

        const users = await window.vidoraData.getAllUsers();
        tbody.innerHTML = "";

        users.forEach(u => {
            const tr = document.createElement("tr");
            const isAdm = u.role === "admin" || u.role === "superadmin";

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color: white;">${u.full_name || 'Pengguna'}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">${u.email}</div>
                </td>
                <td>
                    <span class="${isAdm ? 'role-badge-admin' : 'role-badge-user'}">${isAdm ? 'Super Admin' : 'Member'}</span>
                </td>
                <td>
                    <span style="font-family: monospace; font-weight: 700;">${isAdm ? 'Unlimited' : (u.max_google_accounts || 5) + ' Akun'}</span>
                </td>
                <td>
                    <button class="btn-table-action btn-toggle-user-role" data-uid="${u.id}" data-currole="${u.role}">
                        ${isAdm ? 'Jadikan Member' : 'Jadikan Admin'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

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
    }

    document.getElementById("btnRefreshAdminUsers").addEventListener("click", renderAdminUsers);

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

    document.getElementById("btnRefreshAdminQueue").addEventListener("click", renderAdminQueue);

    // Render Admin Orders
    async function renderAdminOrders() {
        const tbody = document.getElementById("adminOrdersTableBody");
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Memuat pesanan...</td></tr>`;

        const orders = await window.vidoraData.getAllOrders();
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-tertiary);">Belum ada riwayat pesanan checkout.</td></tr>`;
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement("tr");
            const isPaid = o.status === "paid";

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color: white;">${o.id}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">${o.customer_name} (${o.customer_phone || '-'})</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${o.plan_name}</div>
                    <div style="font-size: 11px; color: var(--accent-cyan);">Rp ${(o.price || 0).toLocaleString("id-ID")}</div>
                </td>
                <td>
                    <span style="font-weight: 600; font-size: 11px;">${o.payment_method}</span>
                </td>
                <td>
                    <span style="font-weight: 700; color: ${isPaid ? '#10b981' : '#f59e0b'}; font-size: 11px;">
                        ${isPaid ? 'LUNAS (AKTIF)' : 'PENDING'}
                    </span>
                </td>
                <td>
                    ${isPaid 
                        ? `<span style="font-size: 11px; color: #10b981;">✓ Terverifikasi</span>`
                        : `<button class="btn-table-action btn-approve-order" data-oid="${o.id}" style="color: #10b981;">Aktifkan</button>`
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll(".btn-approve-order").forEach(b => {
            b.addEventListener("click", async () => {
                const oid = b.getAttribute("data-oid");
                const targetOrder = orders.find(o => o.id === oid);
                await window.vidoraData.approveOrder(oid);
                renderAdminOrders();

                // Trigger WhatsApp Notification via xsender.id
                if (window.xsender && targetOrder) {
                    window.xsender.notifyOrderApproved(targetOrder).then(res => {
                        if (res && res.success) {
                            alert(`Pesanan ${oid} disetujui!\nNotifikasi WhatsApp aktivasi paket telah dikirim ke ${targetOrder.customer_phone || targetOrder.customer_name}.`);
                        } else {
                            alert("Pesanan berhasil disetujui & paket 5 profil Google pengguna telah aktif!");
                        }
                    }).catch(() => {
                        alert("Pesanan berhasil disetujui & paket pengguna diaktifkan!");
                    });
                } else {
                    alert("Pesanan berhasil disetujui & paket pengguna diaktifkan!");
                }
            });
        });
    }

    document.getElementById("btnRefreshAdminOrders").addEventListener("click", renderAdminOrders);

    // =========================================================================
    // 5.1 Super Admin WhatsApp Gateway Controller (xsender.id)
    // =========================================================================
    function renderAdminWhatsapp() {
        if (!window.xsender) return;
        const cfg = window.xsender.config;

        const urlInput = document.getElementById("xsenderApiUrl");
        const tokenInput = document.getElementById("xsenderApiToken");
        const deviceInput = document.getElementById("xsenderDeviceId");
        const adminPhoneInput = document.getElementById("xsenderAdminPhone");
        const chkOrder = document.getElementById("checkNotifyOrder");
        const chkApproval = document.getElementById("checkNotifyApproval");
        const chkRender = document.getElementById("checkNotifyRender");
        const tplApproval = document.getElementById("xsenderTemplateApproval");

        if (urlInput) urlInput.value = cfg.apiUrl || "https://api.xsender.id/v1/messages";
        if (tokenInput) tokenInput.value = cfg.apiToken || "";
        if (deviceInput) deviceInput.value = cfg.deviceId || "";
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
            const newCfg = {
                apiUrl: document.getElementById("xsenderApiUrl").value.trim(),
                apiToken: document.getElementById("xsenderApiToken").value.trim(),
                deviceId: document.getElementById("xsenderDeviceId").value.trim(),
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

    // Gemini Vision API Caller
    async function analyzeProductImageWithGemini(base64Data, mode, style, platform, extra = "") {
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
            platformInstruction = "Target Platform: TikTok Shop video. Include subtle commercial hook, viral pacing, framing tailored for TikTok overlay, and a natural CTA indicating 'Check Keranjang Kuning di bawah!'";
        } else if (platform === "shopee") {
            platformInstruction = "Target Platform: Shopee Video. Include bright commercial lighting, discount voucher callout feel, product detail focus, and a natural CTA indicating 'Klik Keranjang Oranye di bawah!'";
        } else if (platform === "reels") {
            platformInstruction = "Target Platform: Instagram Reels. Clean luxury modern aesthetic, seamless lifestyle loop, aesthetic color grading.";
        }

        const systemPrompt = `You are VIDORA Smart Prompt Generator, an expert commercial director and product photographer.
Your task: Analyze the provided product photo and generate an extremely rich, cinematic, photorealistic prompt for Google Flow AI (Omni Flash).
Mode: ${mode}
Style: ${style}
${platformInstruction}
Additional details requested: ${extra || "None"}

Requirements for the generated prompt:
1. Describe the product clearly based on visual features (color, bottle shape, texture, material, packaging).
2. Specify cinematic lighting (e.g. rim lighting, golden hour reflection, soft volumetric haze, dramatic shadows).
3. Specify dynamic camera motion (e.g. smooth macro slow tracking shot, rotating pedestal 360, gentle push-in).
4. Specify ultra-high resolution keywords (e.g. 4k 60fps vertical 9:16, unreal engine 5 aesthetic, photorealistic texture).
5. Output ONLY the finalized prompt text. No introductory remarks, no explanations, no quotes.`;

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
        if (!uploadedProductImage) {
            alert("Silakan upload foto produk terlebih dahulu di kotak upload di atas!");
            videoFileInput.click();
            return;
        }

        btnVideoAutoPrompt.disabled = true;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa Foto...</span>`;
        lucide.createIcons();

        const platform = document.getElementById("videoPlatformSelect")?.value || "tiktok";
        const prompt = await analyzeProductImageWithGemini(uploadedProductImage, "Commercial Product Video", "Cinematic Commercial", platform);
        
        btnVideoAutoPrompt.disabled = false;
        btnVideoAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto Prompt dari Foto</span>`;
        lucide.createIcons();

        if (prompt) {
            videoPromptInput.value = prompt;
            videoPromptInput.focus();
        }
    });

    btnImageAutoPrompt.addEventListener("click", async () => {
        if (!uploadedProductImage) {
            alert("Silakan upload foto produk referensi terlebih dahulu!");
            imageFileInput.click();
            return;
        }

        btnImageAutoPrompt.disabled = true;
        btnImageAutoPrompt.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px;height:13px;"></i> <span>Menganalisa...</span>`;
        lucide.createIcons();

        const platform = document.getElementById("imagePlatformSelect")?.value || "tiktok";
        const prompt = await analyzeProductImageWithGemini(uploadedProductImage, "Product Studio Photography", "Studio Clean", platform);
        
        btnImageAutoPrompt.disabled = false;
        btnImageAutoPrompt.innerHTML = `<i data-lucide="sparkles" style="width:13px;height:13px;"></i> <span>Auto Prompt dari Foto</span>`;
        lucide.createIcons();

        if (prompt) {
            imagePromptInput.value = prompt;
            imagePromptInput.focus();
        }
    });

    btnRunPromptGen.addEventListener("click", async () => {
        if (!uploadedProductImage) {
            alert("Silakan pilih/upload foto produk di tab Prompt Generator terlebih dahulu!");
            pgFileInput.click();
            return;
        }

        btnRunPromptGen.disabled = true;
        btnRunPromptGen.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> <span>Menganalisa Objek Produk...</span>`;
        lucide.createIcons();

        const mode = pgModeSelect.value;
        const style = pgStyleSelect.value;
        const platform = pgPlatformSelect.value;
        const extra = pgExtraInput.value.trim();

        const prompt = await analyzeProductImageWithGemini(uploadedProductImage, mode, style, platform, extra);

        btnRunPromptGen.disabled = false;
        btnRunPromptGen.innerHTML = `<i data-lucide="sparkles" style="width:18px;height:18px;"></i> <span>Generate Smart Prompt Sekarang</span>`;
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
                    </div>
                `;
                card.addEventListener("click", () => openMediaModal(job));
                galleryGrid.appendChild(card);
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

    window.vidoraData.subscribeJobs(() => {
        refreshJobs();
    });

    // Run Init
    await initApp();

    // Check URL parameters for direct action
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get("plan");
    const tabParam = urlParams.get("tab");

    const authParam = urlParams.get("auth");

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
});

