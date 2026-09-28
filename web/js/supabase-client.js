// =========================================================================
// VIDORA Supabase & Data Bridge
// =========================================================================

class VidoraDataBridge {
    constructor() {
        this.client = null;
        this.isLive = false;
        this.currentUser = null;
        this.currentProfile = null;
        this.init();
    }

    init() {
        const url = window.VIDORA_CONFIG.SUPABASE_URL;
        const key = window.VIDORA_CONFIG.SUPABASE_ANON_KEY;

        if (window.supabase && url && url !== "https://your-project.supabase.co" && key && !key.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")) {
            try {
                this.client = window.supabase.createClient(url, key);
                this.isLive = true;
                console.log("[VIDORA] Terhubung ke Supabase Live Database.");
            } catch (e) {
                console.warn("[VIDORA] Gagal menghubungkan Supabase:", e);
                this.initDemoMode();
            }
        } else {
            console.log("[VIDORA] Menjalankan Sandbox/Demo Mode (Kredensial Supabase belum diisi).");
            this.initDemoMode();
        }
    }

    initDemoMode() {
        this.isLive = false;
        // Demo user
        this.currentUser = {
            id: "demo-user-id-12345",
            email: "creative_creator@vidora.ai",
            user_metadata: { full_name: "Kreator Sukses" }
        };
        this.currentProfile = {
            id: this.currentUser.id,
            email: this.currentUser.email,
            full_name: "Kreator Sukses",
            role: "user",
            max_google_accounts: 5
        };

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
                    prompt: "Cinematic drone shot of futuristic Neo-Tokyo neon lights cyberpunk flying taxi 4k 60fps",
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
    }

    async getSession() {
        if (!this.isLive) {
            return { user: this.currentUser, profile: this.currentProfile };
        }
        const { data: { session }, error } = await this.client.auth.getSession();
        if (error || !session) return null;
        this.currentUser = session.user;
        
        // Fetch Profile
        const { data: profile } = await this.client.table("profiles").select("*").eq("id", this.currentUser.id).single();
        this.currentProfile = profile || { id: this.currentUser.id, email: this.currentUser.email, role: 'user', max_google_accounts: 5 };
        return { user: this.currentUser, profile: this.currentProfile };
    }

    async signIn(email, password) {
        if (!this.isLive) {
            this.currentUser = { id: "demo-user-id", email, user_metadata: { full_name: email.split("@")[0] } };
            return { user: this.currentUser };
        }
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async signUp(email, password, fullName) {
        if (!this.isLive) {
            this.currentUser = { id: "demo-user-id", email, user_metadata: { full_name: fullName } };
            return { user: this.currentUser };
        }
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        return data;
    }

    async signOut() {
        if (!this.isLive) return true;
        await this.client.auth.signOut();
        this.currentUser = null;
        this.currentProfile = null;
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
            if (accounts.length >= limit) {
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
            { pct: 15, msg: "Membuka Google Flow dengan browser tersembunyi..." },
            { pct: 35, msg: "Memilih Model Omni Flash & Aspect Ratio..." },
            { pct: 60, msg: "Mengirim prompt ke Google Flow..." },
            { pct: 85, msg: "Merender video & mengunggah ke Cloudflare R2..." },
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
        }, 3500);
    }

    subscribeJobs(callback) {
        if (!this.isLive) {
            window.addEventListener("vidora:job_updated", (e) => callback(e.detail));
            return;
        }

        this.client.channel("generate_jobs_channel")
            .on("postgres_changes", { event: "*", schema: "public", table: "generate_jobs", filter: `user_id=eq.${this.currentUser.id}` }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }
}

window.vidoraData = new VidoraDataBridge();
