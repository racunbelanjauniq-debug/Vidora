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

        this.currentUser = {
            id: "superadmin-master",
            email: adminEmail,
            user_metadata: { full_name: "Winal Islam (Super Admin)" }
        };

        this.currentProfile = {
            id: "superadmin-master",
            email: adminEmail,
            full_name: "Winal Islam (Super Admin)",
            role: "superadmin",
            max_google_accounts: 99999,
            is_subscribed: true
        };

        if (this.isLive) {
            try {
                await this.client.auth.signInWithPassword({ email: adminEmail, password });
            } catch (e) {
                try {
                    await this.client.auth.signUp({
                        email: adminEmail,
                        password,
                        options: { data: { full_name: "Winal Islam (Super Admin)" } }
                    });
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
                }, { onConflict: "email" });
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
        const isOwner = email === "winalislam@gmail.com" || 
                        (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(email));

        if (!this.isLive) {
            this.currentUser = { id: "demo-user-" + Date.now(), email, user_metadata: { full_name: email.split("@")[0] } };
            this.currentProfile = {
                id: this.currentUser.id,
                email: email,
                full_name: email.split("@")[0],
                role: (isOwner || email.includes("admin")) ? "superadmin" : "user",
                max_google_accounts: (isOwner || email.includes("admin")) ? 99999 : 5
            };
            localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            return { user: this.currentUser, profile: this.currentProfile };
        }
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await this.getSession();
        return data;
    }

    async signUp(email, password, fullName) {
        const isOwner = email === "winalislam@gmail.com" || 
                        (window.VIDORA_CONFIG.SUPERADMIN_EMAILS && window.VIDORA_CONFIG.SUPERADMIN_EMAILS.includes(email));

        if (!this.isLive) {
            this.currentUser = { id: "demo-user-" + Date.now(), email, user_metadata: { full_name: fullName } };
            this.currentProfile = {
                id: this.currentUser.id,
                email: email,
                full_name: fullName,
                role: (isOwner || email.includes("admin")) ? "superadmin" : "user",
                max_google_accounts: (isOwner || email.includes("admin")) ? 99999 : 5
            };
            localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            return { user: this.currentUser, profile: this.currentProfile };
        }
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        await this.getSession();
        return data;
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
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_accounts") || "[]";
            return JSON.parse(raw);
        }
        const { data, error } = await this.client.from("google_accounts").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async addGoogleAccount(email, label = "") {
        if (!this.isLive) {
            const accounts = await this.getGoogleAccounts();
            const limit = this.currentProfile?.max_google_accounts || 5;
            if (this.currentProfile?.role !== "superadmin" && accounts.length >= limit) {
                throw new Error(`Batas kuota ${limit} akun Google tercapai. Upgrade ke Pro untuk tambah akun.`);
            }
            if (accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
                throw new Error("Akun Google ini sudah terdaftar.");
            }
            const newAcc = {
                id: "acc-" + Date.now(),
                email,
                label: label || `Akun ${accounts.length + 1}`,
                status: "active",
                credit_status: "ready",
                created_at: new Date().toISOString()
            };
            accounts.unshift(newAcc);
            localStorage.setItem("vidora_demo_accounts", JSON.stringify(accounts));
            return newAcc;
        }

        const { data, error } = await this.client.from("google_accounts").insert({
            user_id: this.currentUser.id,
            email,
            label,
            status: "active",
            credit_status: "ready"
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteGoogleAccount(id) {
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

        const { data, error } = await this.client.from("generate_jobs").insert({
            user_id: this.currentUser.id,
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
        try {
            const { data, error } = await this.client.from("profiles").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            return JSON.parse(raw);
        }
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

    async toggleUserSubscription(userId, isSubscribed) {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            const users = JSON.parse(raw);
            const target = users.find(u => u.id === userId);
            if (target) {
                target.is_subscribed = isSubscribed;
                localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            }
            if (this.currentProfile && this.currentProfile.id === userId) {
                this.currentProfile.is_subscribed = isSubscribed;
                localStorage.setItem("vidora_demo_current_user", JSON.stringify({ user: this.currentUser, profile: this.currentProfile }));
            }
            return true;
        }
        try {
            const { error } = await this.client.from("profiles").update({ is_subscribed: isSubscribed }).eq("id", userId);
            if (error) throw error;
            if (this.currentProfile && this.currentProfile.id === userId) {
                this.currentProfile.is_subscribed = isSubscribed;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async deleteUser(userId) {
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_users") || "[]";
            let users = JSON.parse(raw);
            users = users.filter(u => u.id !== userId);
            localStorage.setItem("vidora_demo_users", JSON.stringify(users));
            return true;
        }
        try {
            await this.client.from("profiles").delete().eq("id", userId);
            return true;
        } catch (e) {
            return false;
        }
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
        if (!this.isLive) {
            const raw = localStorage.getItem("vidora_demo_orders") || "[]";
            let orders = JSON.parse(raw);
            orders = orders.filter(o => o.id !== orderId);
            localStorage.setItem("vidora_demo_orders", JSON.stringify(orders));
            return true;
        }
        try {
            await this.client.from("orders").delete().eq("id", orderId);
            return true;
        } catch (e) {
            return false;
        }
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
