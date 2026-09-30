// =========================================================================
// VIDORA Supabase & Data Bridge (SaaS Architecture)
// =========================================================================

class VidoraDataBridge {
    constructor() {
        this.client = null;
        this.isLive = false;
        this.currentUser = null;
        this.currentProfile = null;
        this.init();
    }

    async init() {
        if (window.syncVercelEnv) {
            await window.syncVercelEnv();
        }
        const url = window.VIDORA_CONFIG.SUPABASE_URL;
        const key = window.VIDORA_CONFIG.SUPABASE_ANON_KEY;

        if (window.supabase && url && url !== "https://your-project.supabase.co" && key && !key.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")) {
            try {
                this.client = window.supabase.createClient(url, key);
                this.isLive = true;
                console.log("[VIDORA] Terhubung ke Supabase Live Database:", url);
            } catch (e) {
                console.warn("[VIDORA] Gagal menghubungkan Supabase:", e);
                this.initDemoMode();
            }
        } else {
            console.log("[VIDORA] Menjalankan Sandbox / Demo Mode.");
            this.initDemoMode();
        }
    }

    initDemoMode() {
        this.isLive = false;
        // Demo user (persisted in localStorage if available)
        const savedDemoUser = localStorage.getItem("vidora_demo_current_user");
        if (savedDemoUser) {
            try {
                const parsed = JSON.parse(savedDemoUser);
                this.currentUser = parsed.user;
                this.currentProfile = parsed.profile;
            } catch (e) {
                this.currentUser = null;
                this.currentProfile = null;
            }
        } else {
            this.currentUser = null;
            this.currentProfile = null;
        }

        if (!localStorage.getItem("vidora_demo_accounts")) {
            const initialAccounts = [
                { id: "acc-1", email: "creator.flow01@gmail.com", label: "Akun Utama", status: "active", credit_status: "ready", last_used_at: new Date().toISOString() },
                { id: "acc-2", email: "affiliate.video02@gmail.com", label: "Cadangan 1", status: "active", credit_status: "ready", last_used_at: new Date(Date.now() - 3600000).toISOString() },
                { id: "acc-3", email: "shorts.machine03@gmail.com", label: "Khusus Shorts", status: "active", credit_status: "ready", last_used_at: new Date(Date.now() - 7200000).toISOString() },
            ];
            localStorage.setItem("vidora_demo_accounts", JSON.stringify(initialAccounts));
        }

        if (!localStorage.getItem("vidora_demo_jobs")) {
            const initialJobs = [
                {
                    id: "job-101",
                    prompt: "Cinematic commercial product shot of skincare serum bottle glowing luxury aesthetic 4k 60fps vertical",
                    model: "Omni Flash",
                    ratio: "9:16",
                    status: "completed",
                    progress: 100,
                    status_message: "Selesai",
                    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    thumbnail_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
                    created_at: new Date(Date.now() - 1800000).toISOString()
                },
                {
                    id: "job-102",
                    prompt: "Hyper-realistic slow motion espresso pouring into glass cup luxury coffee bar aesthetic",
                    model: "Omni Flash",
                    ratio: "9:16",
                    status: "completed",
                    progress: 100,
                    status_message: "Selesai",
                    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                    thumbnail_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80",
                    created_at: new Date(Date.now() - 3600000).toISOString()
                }
            ];
            localStorage.setItem("vidora_demo_jobs", JSON.stringify(initialJobs));
        }

        if (!localStorage.getItem("vidora_demo_orders")) {
            const initialOrders = [
                {
                    id: "INV-VID-9021",
                    customer_name: "Budi Santoso",
                    customer_phone: "08123456789",
                    customer_email: "budi@affiliate.id",
                    plan_name: "Pro Studio",
                    price: 99000,
                    payment_method: "QRIS",
                    status: "paid",
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ];
            localStorage.setItem("vidora_demo_orders", JSON.stringify(initialOrders));
        }
    }

    resetDemoUser(role = "superadmin", isSubscribed = null) {
        const sub = isSubscribed !== null ? isSubscribed : (role === "superadmin");
        this.currentUser = {
            id: "owner-user-winal",
            email: "winalislam@gmail.com",
            user_metadata: { full_name: role === "superadmin" ? "Winal Islam (Super Admin)" : "Winal Islam (Member)" }
        };
        this.currentProfile = {
            id: this.currentUser.id,
            email: this.currentUser.email,
            full_name: role === "superadmin" ? "Winal Islam (Super Admin)" : "Winal Islam (Member)",
            role: role,
            max_google_accounts: role === "superadmin" ? 99999 : 5,
            is_subscribed: sub
        };
        localStorage.setItem("vidora_demo_current_user", JSON.stringify({
            user: this.currentUser,
            profile: this.currentProfile
        }));
    }

    // Toggle Role for easy previewing
    toggleDemoRole() {
        const nextRole = this.currentProfile?.role === "superadmin" ? "user" : "superadmin";
        this.resetDemoUser(nextRole);
        return this.currentProfile;
    }

    // Toggle Subscription Status for quick testing
    toggleDemoSubscription() {
        if (!this.currentProfile) return false;
        this.currentProfile.is_subscribed = !this.currentProfile.is_subscribed;
        if (!this.isLive) {
            localStorage.setItem("vidora_demo_current_user", JSON.stringify({
                user: this.currentUser,
                profile: this.currentProfile
            }));
        }
        return this.currentProfile.is_subscribed;
    }

    // Save Cloud Credentials
    saveCloudConfig(supabaseUrl, supabaseKey, r2Domain) {
        localStorage.setItem("vidora_supabase_url", supabaseUrl.trim());
        localStorage.setItem("vidora_supabase_key", supabaseKey.trim());
        if (r2Domain) {
            localStorage.setItem("vidora_r2_domain", r2Domain.trim());
            window.VIDORA_CONFIG.R2_PUBLIC_DOMAIN = r2Domain.trim();
        }
        window.VIDORA_CONFIG.SUPABASE_URL = supabaseUrl.trim();
        window.VIDORA_CONFIG.SUPABASE_ANON_KEY = supabaseKey.trim();

        this.init();
        return this.isLive;
    }

    async testConnection() {
        if (!this.isLive) {
            return { success: false, message: "Kredensial belum terpasang atau tidak valid." };
        }
        try {
            const { data, error } = await this.client.from("profiles").select("count", { count: "exact", head: true });
            if (error && error.code !== "PGRST116") {
                // Table might not exist yet
                return { success: true, message: "Terhubung ke Supabase! (Catatan: Pastikan schema.sql sudah dijalankan di SQL Editor)" };
            }
            return { success: true, message: "Koneksi Supabase Live Berhasil & Aktif!" };
        } catch (e) {
            return { success: false, message: "Gagal terhubung: " + e.message };
        }
    }

    // Authentication Methods
    async getSession() {
        // Priority 1: Check persistent Super Admin session
        const adminSessionRaw = localStorage.getItem("vidora_admin_session");
        if (adminSessionRaw) {
            try {
                const adminData = JSON.parse(adminSessionRaw);
                if (adminData && adminData.role === "superadmin" && adminData.profile) {
                    this.currentUser = adminData.user;
                    this.currentProfile = adminData.profile;
                    // Auto-fix if stored id is "superadmin-master" or non-UUID
                    if (this.currentUser?.id === "superadmin-master" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.currentUser?.id || "")) {
                        this.currentUser.id = "00000000-0000-0000-0000-000000000001";
                        if (this.currentProfile) this.currentProfile.id = "00000000-0000-0000-0000-000000000001";
                        localStorage.setItem("vidora_admin_session", JSON.stringify({
                            user: this.currentUser,
                            profile: this.currentProfile,
                            role: "superadmin",
                            timestamp: Date.now()
                        }));
                    }
                    return { user: this.currentUser, profile: this.currentProfile };
                }
            } catch (e) {}
        }

        if (!this.isLive) {
            if (!this.currentUser) return null;
            return { user: this.currentUser, profile: this.currentProfile };
        }
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error || !session) {
                this.currentUser = null;
                this.currentProfile = null;
                return null;
            }
            this.currentUser = session.user;
            
            // Fetch Profile
            const { data: profile } = await this.client.from("profiles").select("*").eq("id", this.currentUser.id).single();
            this.currentProfile = profile || { 
                id: this.currentUser.id, 
                email: this.currentUser.email, 
                full_name: this.currentUser.user_metadata?.full_name || this.currentUser.email.split("@")[0],
                role: 'user', 
                max_google_accounts: 5 
            };
            // Whitelist Super Admin for Owner
            const isOwner = this.currentUser.email === "winalislam@gmail.com" || 
                            (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(this.currentUser.email));
            
            if (isOwner && this.currentProfile) {
                this.currentProfile.role = "superadmin";
                this.currentProfile.max_google_accounts = 99999;
                this.currentProfile.is_subscribed = true;
            } else if (this.currentProfile) {
                if (this.currentProfile.role === "superadmin" || this.currentProfile.role === "admin") {
                    this.currentProfile.is_subscribed = true;
                } else if (this.currentProfile.is_subscribed === undefined || this.currentProfile.is_subscribed === null) {
                    try {
                        const { data: paidOrders } = await this.client.from("orders").select("id").eq("user_id", this.currentUser.id).eq("status", "paid").limit(1);
                        this.currentProfile.is_subscribed = (paidOrders && paidOrders.length > 0) ? true : false;
                    } catch (e) {
                        this.currentProfile.is_subscribed = false;
                    }
                }
            }

            return { user: this.currentUser, profile: this.currentProfile };
        } catch (e) {
            console.error("[VIDORA] Error getting session:", e);
            return null;
        }
    }

    async ensureValidUserId() {
        let currentId = this.currentUser?.id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId || "");
        if (isUuid) {
            return currentId;
        }

        const userEmail = (this.currentUser?.email || "winalislam@gmail.com").toLowerCase().trim();
        const fallbackUuid = "00000000-0000-0000-0000-000000000001";

        if (this.isLive) {
            try {
                const { data: existingProf } = await this.client
                    .from("profiles")
                    .select("id")
                    .eq("email", userEmail)
                    .maybeSingle();

                if (existingProf && existingProf.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingProf.id)) {
                    if (this.currentUser) this.currentUser.id = existingProf.id;
                    if (this.currentProfile) this.currentProfile.id = existingProf.id;
                    return existingProf.id;
                }
            } catch (e) {}

            try {
                await this.client.from("profiles").upsert({
                    id: fallbackUuid,
                    email: userEmail,
                    full_name: this.currentProfile?.full_name || "Winal Islam (Super Admin)",
                    role: this.currentProfile?.role || "superadmin",
                    max_google_accounts: 99999,
                    is_subscribed: true
                }, { onConflict: "id" });
            } catch (err) {}
        }

        if (this.currentUser) this.currentUser.id = fallbackUuid;
        if (this.currentProfile) this.currentProfile.id = fallbackUuid;
        return fallbackUuid;
    }

    async adminSignIn(email, password) {
        const adminEmail = (email || "winalislam@gmail.com").trim().toLowerCase();
        const expectedPass = window.VIDORA_CONFIG.ADMIN_PASSWORD || "Wakrod99$";

        if (password !== expectedPass) {
            throw new Error("Password Administrator salah. Akses ditolak.");
        }

        const isOwner = adminEmail === "winalislam@gmail.com" || 
                        (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(adminEmail)) ||
                        adminEmail.includes("admin");

        if (!isOwner) {
            throw new Error("Akses Ditolak: Alamat email ini tidak terdaftar sebagai Administrator.");
        }

        const masterUuid = "00000000-0000-0000-0000-000000000001";

        this.currentUser = {
            id: masterUuid,
            email: adminEmail,
            user_metadata: { full_name: "Winal Islam (Super Admin)" }
        };

        this.currentProfile = {
            id: masterUuid,
            email: adminEmail,
            full_name: "Winal Islam (Super Admin)",
            role: "superadmin",
            max_google_accounts: 99999,
            is_subscribed: true
        };

        if (this.isLive) {
            try {
                const { data } = await this.client.auth.signInWithPassword({ email: adminEmail, password });
                if (data && data.user) {
                    this.currentUser = data.user;
                    this.currentProfile.id = data.user.id;
                }
            } catch (e) {
                try {
                    const { data: upData } = await this.client.auth.signUp({
                        email: adminEmail,
                        password,
                        options: { data: { full_name: "Winal Islam (Super Admin)" } }
                    });
                    if (upData && upData.user) {
                        this.currentUser = upData.user;
                        this.currentProfile.id = upData.user.id;
                    }
                } catch (err) {}
            }

            try {
                await this.client.from("profiles").upsert({
                    id: this.currentUser.id,
                    email: adminEmail,
                    full_name: "Winal Islam (Super Admin)",
                    role: "superadmin",
                    max_google_accounts: 99999,
                    is_subscribed: true
                }, { onConflict: "id" });
            } catch (err) {}
        }

        localStorage.setItem("vidora_admin_session", JSON.stringify({
            user: this.currentUser,
            profile: this.currentProfile,
            role: "superadmin",
            timestamp: Date.now()
        }));

        localStorage.setItem("vidora_demo_current_user", JSON.stringify({
            user: this.currentUser,
            profile: this.currentProfile
        }));

        return { user: this.currentUser, profile: this.currentProfile };
    }

    async signIn(email, password) {
        const cleanEmail = (email || "").trim().toLowerCase();
        const isOwner = cleanEmail === "winalislam@gmail.com" || 
                        (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(cleanEmail));

        if (!this.isLive) {
            this.currentUser = { id: "demo-user-" + Date.now(), email: cleanEmail, user_metadata: { full_name: cleanEmail.split("@")[0] } };
            this.currentProfile = {
                id: this.currentUser.id,
                email: cleanEmail,
                full_name: cleanEmail.split("@")[0],
                role: (isOwner || cleanEmail.includes("admin")) ? "superadmin" : "user",
                max_google_accounts: (isOwner || cleanEmail.includes("admin")) ? 99999 : 5
            };
            localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            return { user: this.currentUser, profile: this.currentProfile };
        }

        let { data, error } = await this.client.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
            const errMsg = (error.message || "").toLowerCase();
            // Jika error adalah "Email not confirmed", lakukan auto-confirm instan via Serverless Admin API
            if (errMsg.includes("email not confirmed") || errMsg.includes("email_not_confirmed")) {
                console.log("[VIDORA Auth] Email belum diverifikasi di Supabase, melakukan auto-confirm instan...");
                try {
                    const confirmRes = await fetch("/api/manage-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "confirm_email", email: cleanEmail })
                    });
                    const confirmJson = await confirmRes.json();
                    if (confirmJson.success) {
                        console.log("[VIDORA Auth] Auto-confirm berhasil, mengulang login...");
                        const retry = await this.client.auth.signInWithPassword({ email: cleanEmail, password });
                        if (retry.error) throw retry.error;
                        data = retry.data;
                        error = null;
                    } else {
                        throw error;
                    }
                } catch (retryErr) {
                    throw retryErr;
                }
            } else {
                throw error;
            }
        }
        await this.getSession();
        return data;
    }

    async signUp(email, password, fullName, phone = "") {
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanName = (fullName || cleanEmail.split("@")[0]).trim();
        const cleanPhone = (phone || "").trim();
        const isOwner = cleanEmail === "winalislam@gmail.com" || 
                        (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(cleanEmail));

        if (!this.isLive) {
            this.currentUser = { id: "demo-user-" + Date.now(), email: cleanEmail, user_metadata: { full_name: cleanName, phone: cleanPhone } };
            this.currentProfile = {
                id: this.currentUser.id,
                email: cleanEmail,
                full_name: cleanName,
                phone: cleanPhone,
                role: (isOwner || cleanEmail.includes("admin")) ? "superadmin" : "user",
                max_google_accounts: (isOwner || cleanEmail.includes("admin")) ? 99999 : 5
            };
            localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            return { user: this.currentUser, profile: this.currentProfile };
        }

        // 1. Daftarkan akun via Serverless Admin API agar langsung terverifikasi (email_confirm: true)
        let registeredViaApi = false;
        try {
            const apiRes = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "register_user",
                    email: cleanEmail,
                    password: password,
                    full_name: cleanName,
                    phone: cleanPhone
                })
            });
            const apiData = await apiRes.json();
            if (apiData && apiData.success) {
                registeredViaApi = true;
            }
        } catch (apiErr) {
            console.warn("[VIDORA Auth] register_user API warning:", apiErr);
        }

        // 2. Fallback Supabase Client jika API tidak merespons
        if (!registeredViaApi) {
            const { error: supErr } = await this.client.auth.signUp({
                email: cleanEmail,
                password,
                options: { data: { full_name: cleanName, phone: cleanPhone } }
            });
            if (supErr) {
                const errMsg = (supErr.message || "").toLowerCase();
                if (!errMsg.includes("already registered") && !errMsg.includes("already been registered")) {
                    throw supErr;
                }
            }
            // Auto confirm email agar akun langsung aktif
            try {
                await fetch("/api/manage-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "confirm_email", email: cleanEmail })
                });
            } catch (_) {}
        }

        // 3. Login otomatis dengan password agar sesi Supabase client tersimpan di browser
        let { data: signData, error: signErr } = await this.client.auth.signInWithPassword({ email: cleanEmail, password });
        if (signErr) {
            const errMsg = (signErr.message || "").toLowerCase();
            if (errMsg.includes("email not confirmed") || errMsg.includes("email_not_confirmed")) {
                await fetch("/api/manage-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "confirm_email", email: cleanEmail })
                });
                const retrySign = await this.client.auth.signInWithPassword({ email: cleanEmail, password });
                if (retrySign.error) throw retrySign.error;
                signData = retrySign.data;
            } else {
                throw signErr;
            }
        }

        // 4. Pastikan data profile (nama & nomor HP) tersimpan di public.profiles
        if (cleanPhone || cleanName) {
            try {
                const { data: uData } = await this.client.auth.getUser();
                if (uData && uData.user && uData.user.id) {
                    await this.client.from("profiles").upsert({
                        id: uData.user.id,
                        email: cleanEmail,
                        full_name: cleanName,
                        phone: cleanPhone,
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (_) {}
        }

        await this.getSession();
        return { user: this.currentUser, profile: this.currentProfile };
    }

    async signOut() {
        localStorage.removeItem("vidora_admin_session");
        localStorage.removeItem("vidora_demo_current_user");
        this.currentUser = null;
        this.currentProfile = null;
        if (this.isLive) {
            try { await this.client.auth.signOut(); } catch (e) {}
        }
        return true;
    }

    // Google Accounts
    async getGoogleAccounts() {
        // 1. Coba lewat backend serverless bypass RLS lebih dulu
        try {
            const apiRes = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "list_google_accounts" })
            });
            if (apiRes.ok) {
                const resJson = await apiRes.json();
                if (resJson.success && Array.isArray(resJson.accounts)) {
                    return resJson.accounts;
                }
            }
        } catch (_) {}

        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_accounts") || "[]";
            return JSON.parse(raw);
        }

        const validUserId = await this.ensureValidUserId();
        const { data, error } = await this.client.from("google_accounts").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async addGoogleAccount(email, label = "") {
        const cleanEmail = (email || "").trim().toLowerCase();
        if (!cleanEmail) throw new Error("Email Google tidak boleh kosong.");

        const validUserId = await this.ensureValidUserId();
        const userEmail = (this.currentUser?.email || "winalislam@gmail.com").toLowerCase().trim();

        // 1. Coba lewat backend serverless (Bypass RLS & auto-fix foreign key UUID)
        try {
            const apiRes = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add_google_account",
                    email: cleanEmail,
                    label: label || "Akun Google Vault",
                    user_email: userEmail,
                    user_id: validUserId
                })
            });
            const apiData = await apiRes.json().catch(() => ({}));
            if (apiRes.ok && apiData.success && apiData.account) {
                return apiData.account;
            } else if (!apiRes.ok && apiData.error) {
                throw new Error(apiData.error);
            }
        } catch (apiErr) {
            if (apiErr.message && !apiErr.message.includes("fetch")) {
                throw apiErr;
            }
        }

        // 2. Demo mode offline fallback
        if (!this.isLive) {
            const accounts = await this.getGoogleAccounts();
            const limit = this.currentProfile?.max_google_accounts || 5;
            if (this.currentProfile?.role !== "superadmin" && accounts.length >= limit) {
                throw new Error(`Batas kuota ${limit} akun Google tercapai. Upgrade ke Pro untuk tambah akun.`);
            }
            if (accounts.some(a => a.email.toLowerCase() === cleanEmail)) {
                throw new Error("Akun Google ini sudah terdaftar.");
            }
            const newAcc = {
                id: "acc-" + Date.now(),
                email: cleanEmail,
                label: label || `Akun ${accounts.length + 1}`,
                status: "active",
                credit_status: "ready",
                created_at: new Date().toISOString()
            };
            accounts.unshift(newAcc);
            localStorage.setItem("vidora_demo_accounts", JSON.stringify(accounts));
            return newAcc;
        }

        // 3. Direct Supabase insert dengan valid UUID
        const { data, error } = await this.client.from("google_accounts").insert({
            user_id: validUserId,
            email: cleanEmail,
            label: label || "Akun Google Vault",
            status: "active",
            credit_status: "ready"
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteGoogleAccount(id) {
        // Coba via backend serverless
        try {
            const apiRes = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "delete_google_account",
                    id: id
                })
            });
            if (apiRes.ok) {
                return true;
            }
        } catch (_) {}

        if (!this.isLive) {
            let accounts = await this.getGoogleAccounts();
            accounts = accounts.filter(a => a.id !== id);
            localStorage.setItem("vidora_demo_accounts", JSON.stringify(accounts));
            return true;
        }
        const { error } = await this.client.from("google_accounts").delete().eq("id", id);
        if (error) throw error;
        return true;
    }

    // Generate Jobs
    async getJobs() {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_jobs") || "[]";
            return JSON.parse(raw);
        }
        const { data, error } = await this.client.from("generate_jobs").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createGenerateJob({ prompt, model, ratio, duration, count, googleAccountId, hidden = true }) {
        if (!this.isLive) {
            const jobs = await this.getJobs();
            const newJob = {
                id: "job-" + Date.now(),
                prompt,
                model: model || "Omni Flash",
                ratio: ratio || "9:16",
                duration: duration || "8s",
                count: count || 1,
                google_account_id: googleAccountId,
                hidden_browser: hidden,
                status: "pending",
                progress: 0,
                status_message: "Menunggu antrian server...",
                created_at: new Date().toISOString()
            };
            jobs.unshift(newJob);
            localStorage.setItem("vidora_demo_jobs", JSON.stringify(jobs));

            // Simulasikan progress di demo mode
            this.simulateDemoJob(newJob.id);
            return newJob;
        }

        const validUserId = await this.ensureValidUserId();

        const { data, error } = await this.client.from("generate_jobs").insert({
            user_id: validUserId,
            google_account_id: googleAccountId || null,
            prompt,
            model,
            ratio,
            duration,
            count,
            hidden_browser: hidden,
            status: "pending",
            progress: 0,
            status_message: "Menunggu antrian server..."
        }).select().single();

        if (error) throw error;
        return data;
    }

    simulateDemoJob(jobId) {
        const steps = [
            { pct: 15, msg: "Membuka browser tersembunyi..." },
            { pct: 40, msg: "Memilih Model Omni Flash & Rasio 9:16..." },
            { pct: 70, msg: "Mengirim prompt ke Google Flow..." },
            { pct: 90, msg: "Merender video sinematik..." },
            { 
                pct: 100, 
                msg: "Selesai", 
                status: "completed", 
                video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                thumbnail_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80"
            }
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i >= steps.length) {
                clearInterval(interval);
                return;
            }
            const step = steps[i];
            const jobs = JSON.parse(localStorage.getItem("vidora_demo_jobs") || "[]");
            const target = jobs.find(j => j.id === jobId);
            if (target) {
                target.progress = step.pct;
                target.status_message = step.msg;
                if (step.status) target.status = step.status;
                if (step.video_url) target.video_url = step.video_url;
                if (step.thumbnail_url) target.thumbnail_url = step.thumbnail_url;
                localStorage.setItem("vidora_demo_jobs", JSON.stringify(jobs));
                window.dispatchEvent(new CustomEvent("vidora:job_updated", { detail: target }));
            }
            i++;
        }, 3000);
    }

    // Super Admin: Users Management
    async getAllUsers() {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_users");
            if (raw) {
                try {
                    return JSON.parse(raw);
                } catch(e) {}
            }
            const defaultUsers = [
                {
                    id: this.currentUser?.id || "demo-1",
                    email: this.currentUser?.email || "winalislam@gmail.com",
                    full_name: this.currentProfile?.full_name || "Winal Islam",
                    role: this.currentProfile?.role || "superadmin",
                    max_google_accounts: this.currentProfile?.max_google_accounts || 99999,
                    is_subscribed: true,
                    created_at: new Date(Date.now() - 604800000).toISOString()
                },
                {
                    id: "user-2",
                    email: "kreator_affiliate@gmail.com",
                    full_name: "Budi Santoso (Kreator Pro)",
                    role: "user",
                    max_google_accounts: 5,
                    is_subscribed: true,
                    created_at: new Date(Date.now() - 172800000).toISOString()
                },
                {
                    id: "user-3",
                    email: "toko_cantik@gmail.com",
                    full_name: "Siti Rahma (Olshop)",
                    role: "user",
                    max_google_accounts: 5,
                    is_subscribed: false,
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ];
            localStorage.setItem("vidora_demo_users", JSON.stringify(defaultUsers));
            return defaultUsers;
        }

        // Coba lewat backend serverless bypass RLS lebih dulu (Super Admin Privilege)
        try {
            const apiRes = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "list_users" })
            });
            if (apiRes.ok) {
                const json = await apiRes.json();
                if (json.success && Array.isArray(json.users) && json.users.length > 0) {
                    localStorage.setItem("vidora_demo_users", JSON.stringify(json.users));
                    return json.users;
                }
            }
        } catch (_) {}

        try {
            const { data, error } = await this.client.from("profiles").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            if (data && data.length > 0) {
                localStorage.setItem("vidora_demo_users", JSON.stringify(data));
                return data;
            }
        } catch (e) {
            console.warn("[VIDORA] Gagal query profiles langsung:", e.message);
        }

        const raw = localStorage.getItem("vidora_demo_users") || "[]";
        return JSON.parse(raw);
    }

    async updateUserRole(userId, newRole) {
        const maxAcc = newRole === "superadmin" ? 99999 : 5;
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            const users = JSON.parse(raw);
            const target = users.find(u => u.id === userId);
            if (target) {
                target.role = newRole;
                target.max_google_accounts = maxAcc;
                localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            }
            if (this.currentProfile && this.currentProfile.id === userId) {
                this.currentProfile.role = newRole;
                this.currentProfile.max_google_accounts = maxAcc;
                localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            }
            return true;
        }
        const { error } = await this.client.from("profiles").update({ role: newRole, max_google_accounts: maxAcc }).eq("id", userId);
        if (error) throw error;
        return true;
    }

    // Fitur Super Admin: Beri Akses Creator Pass (Aktifkan Lisensi)
    async grantUserAccess(userId, maxAccounts = 5) {
        // 1. Simpan di local cache
        const raw = localStorage.getItem("vidora_demo_users") || "[]";
        try {
            const users = JSON.parse(raw);
            const target = users.find(u => u.id === userId);
            if (target) {
                target.is_subscribed = true;
                target.max_google_accounts = maxAccounts;
                localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            }
        } catch (_) {}

        // 2. Kirim ke serverless bypass RLS
        try {
            const res = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "grant_access",
                    user_id: userId,
                    max_google_accounts: maxAccounts
                })
            });
            if (res.ok) return true;
        } catch (_) {}

        // 3. Fallback direct client update jika session admin aktif
        if (this.isLive) {
            try {
                await this.client.from("profiles").update({
                    is_subscribed: true,
                    max_google_accounts: maxAccounts
                }).eq("id", userId);
            } catch (_) {}
        }
        return true;
    }

    // Fitur Super Admin: Cabut Akses Lisensi
    async revokeUserAccess(userId) {
        const raw = localStorage.getItem("vidora_demo_users") || "[]";
        try {
            const users = JSON.parse(raw);
            const target = users.find(u => u.id === userId);
            if (target) {
                target.is_subscribed = false;
                localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            }
        } catch (_) {}

        try {
            const res = await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "revoke_access",
                    user_id: userId
                })
            });
            if (res.ok) return true;
        } catch (_) {}

        if (this.isLive) {
            try {
                await this.client.from("profiles").update({ is_subscribed: false }).eq("id", userId);
            } catch (_) {}
        }
        return true;
    }

    async toggleUserSubscription(userId, isSubscribed, maxAccounts = 5) {
        if (isSubscribed) {
            return await this.grantUserAccess(userId, maxAccounts);
        } else {
            return await this.revokeUserAccess(userId);
        }
    }

    async deleteUser(userId) {
        // 1. Bersihkan dari local storage demo/cache
        try {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            let users = JSON.parse(raw);
            users = users.filter(u => u.id !== userId);
            localStorage.setItem("vidora_demo_users", JSON.stringify(users));
        } catch (_) {}

        // 2. Hapus via serverless endpoint dengan Service Role Key (Bypass RLS)
        try {
            await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_user", user_id: userId })
            });
        } catch (_) {}

        // 3. Jika client Supabase aktif langsung di browser
        if (this.isLive && this.client) {
            try {
                await this.client.from("profiles").delete().eq("id", userId);
            } catch (_) {}
        }

        return true;
    }

    async addUserManual({ email, fullName, role, isSubscribed }) {
        const newUser = {
            id: "user-" + Date.now(),
            email: email.trim(),
            full_name: fullName.trim() || email.split("@")[0],
            role: role || "user",
            max_google_accounts: role === "superadmin" ? 99999 : 5,
            is_subscribed: isSubscribed === true,
            created_at: new Date().toISOString()
        };
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            const users = JSON.parse(raw);
            users.unshift(newUser);
            localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            return newUser;
        }
        try {
            const { data, error } = await this.client.from("profiles").insert([newUser]).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            const users = JSON.parse(raw);
            users.unshift(newUser);
            localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            return newUser;
        }
    }

    async updateUserLimit(userId, newLimit) {
        if (!this.isLive) {
            if (this.currentProfile && this.currentProfile.id === userId) {
                this.currentProfile.max_google_accounts = parseInt(newLimit);
                localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            }
            return true;
        }
        const { error } = await this.client.from("profiles").update({ max_google_accounts: parseInt(newLimit) }).eq("id", userId);
        if (error) throw error;
        return true;
    }

    // Super Admin: Global Queue & Orders
    async getAllJobsGlobal() {
        if (!this.isLive) {
            return this.getJobs();
        }
        const { data, error } = await this.client.from("generate_jobs").select("*, profiles(email)").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async cancelJob(jobId) {
        if (!this.isLive) {
            let jobs = await this.getJobs();
            const target = jobs.find(j => j.id === jobId);
            if (target) {
                target.status = "failed";
                target.status_message = "Dibatalkan oleh Administrator";
                localStorage.setItem("vidora_demo_jobs", JSON.stringify(jobs));
            }
            return true;
        }
        const { error } = await this.client.from("generate_jobs").update({ status: "failed", status_message: "Dibatalkan oleh Administrator" }).eq("id", jobId);
        if (error) throw error;
        return true;
    }

    async deleteJob(jobId) {
        if (!this.isLive) {
            let jobs = await this.getJobs();
            jobs = jobs.filter(j => j.id !== jobId);
            localStorage.setItem("vidora_demo_jobs", JSON.stringify(jobs));
            return true;
        }
        const { error } = await this.client.from("generate_jobs").delete().eq("id", jobId);
        if (error) throw error;
        return true;
    }

    // Form Checkout (CO) & Orders
    async createOrder({ plan, price, name, phone, email, method, status = "pending" }) {
        const order = {
            id: "INV-VID-" + Math.floor(1000 + Math.random() * 9000),
            user_id: this.currentUser?.id || null,
            customer_name: name,
            customer_phone: phone,
            customer_email: email,
            plan_name: plan || "VIDORA Creator Pass",
            price: price || 75000,
            payment_method: method || "QRIS",
            status: status,
            created_at: new Date().toISOString()
        };

        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            const orders = JSON.parse(raw);
            orders.unshift(order);
            localStorage.setItem("vidora_demo_orders", JSON.stringify(orders));
            return order;
        }

        try {
            const { data, error } = await this.client.from("orders").insert(order).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn("[VIDORA] Orders table fallback:", e);
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            const orders = JSON.parse(raw);
            orders.unshift(order);
            localStorage.setItem("vidora_demo_orders", JSON.stringify(orders));
            return order;
        }
    }

    async getAllOrders() {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_orders");
            if (raw) {
                try { return JSON.parse(raw); } catch (e) {}
            }
            const sampleOrders = [
                {
                    id: "INV-VID-8241",
                    customer_name: "Budi Santoso",
                    customer_phone: "081234567890",
                    customer_email: "kreator_affiliate@gmail.com",
                    plan_name: "VIDORA Creator Pass",
                    price: 75000,
                    payment_method: "QRIS",
                    status: "paid",
                    created_at: new Date(Date.now() - 172800000).toISOString()
                },
                {
                    id: "INV-VID-9152",
                    customer_name: "Siti Rahma",
                    customer_phone: "085712345678",
                    customer_email: "toko_cantik@gmail.com",
                    plan_name: "VIDORA Creator Pass",
                    price: 75000,
                    payment_method: "BANK_BCA",
                    status: "pending",
                    created_at: new Date(Date.now() - 3600000).toISOString()
                }
            ];
            localStorage.setItem("vidora_demo_orders", JSON.stringify(sampleOrders));
            return sampleOrders;
        }
        try {
            const { data, error } = await this.client.from("orders").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            return JSON.parse(raw);
        }
    }

    async approveOrder(orderId) {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            const orders = JSON.parse(raw);
            const target = orders.find(o => o.id === orderId);
            if (target) {
                target.status = "paid";
                localStorage.setItem("vidora_demo_orders", JSON.stringify(orders));

                // Activate in demo users if email matches
                const rawUsers = localStorage.getItem("vidora_demo_users") || "[]";
                const users = JSON.parse(rawUsers);
                const userMatch = users.find(u => u.email === target.customer_email);
                if (userMatch) {
                    userMatch.is_subscribed = true;
                    localStorage.setItem("vidora_demo_users", JSON.stringify(users));
                }

                if (this.currentProfile && (this.currentProfile.id === target.user_id || this.currentProfile.email === target.customer_email)) {
                    this.currentProfile.is_subscribed = true;
                    localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
                }
            }
            return true;
        }
        try {
            const { data: orderData, error } = await this.client.from("orders").update({ status: "paid" }).eq("id", orderId).select().single();
            if (error) throw error;
            if (orderData?.user_id) {
                await this.client.from("profiles").update({ is_subscribed: true }).eq("id", orderData.user_id);
            }
            if (orderData?.customer_email) {
                await this.client.from("profiles").update({ is_subscribed: true }).eq("email", orderData.customer_email);
            }
            if (this.currentProfile && (this.currentProfile.id === orderData?.user_id || this.currentProfile.email === orderData?.customer_email)) {
                this.currentProfile.is_subscribed = true;
            }
            return true;
        } catch (e) {
            return true;
        }
    }

    async deleteOrder(orderId) {
        // 1. Selalu bersihkan dari local storage demo/cache
        try {
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            let orders = JSON.parse(raw);
            orders = orders.filter(o => o.id !== orderId);
            localStorage.setItem("vidora_demo_orders", JSON.stringify(orders));
        } catch (_) {}

        // 2. Hapus via serverless endpoint dengan Service Role Key (Bypass RLS)
        try {
            await fetch("/api/manage-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete_order", order_id: orderId })
            });
        } catch (_) {}

        // 3. Jika client Supabase aktif langsung di browser
        if (this.isLive && this.client) {
            try {
                await this.client.from("orders").delete().eq("id", orderId);
            } catch (_) {}
        }

        return true;
    }

    subscribeJobs(callback) {
        if (!this.isLive) {
            window.addEventListener("vidora:job_updated", (e) => callback(e.detail));
            return;
        }

        this.client.channel("generate_jobs_channel")
            .on("postgres_changes", { event: "*", schema: "public", table: "generate_jobs" }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }
}

window.vidoraData = new VidoraDataBridge();
