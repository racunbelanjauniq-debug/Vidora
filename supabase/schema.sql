-- =========================================================================
-- VIDORA SaaS Database Schema (Supabase PostgreSQL)
-- Multi-Profile Google Flow Video Generator
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    max_google_accounts INT DEFAULT 5, -- 5 akun untuk user biasa, 99999 untuk admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger auto-insert profile saat user baru daftar di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, max_google_accounts)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user',
        5
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. GOOGLE PROFILES TABLE (Multi-Profile Chrome)
CREATE TABLE IF NOT EXISTS public.google_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    label TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cooldown', 'needs_relogin', 'invalid')),
    credit_status TEXT DEFAULT 'ready' CHECK (credit_status IN ('ready', 'limited', 'checking', 'unknown')),
    last_credit_check TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_google_email UNIQUE(user_id, email)
);

-- Validasi Kuota Maksimal Akun Google per User (Max 5 Akun)
CREATE OR REPLACE FUNCTION public.check_max_google_accounts()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    max_limit INT;
    current_count INT;
BEGIN
    SELECT role, max_google_accounts INTO user_role, max_limit 
    FROM public.profiles 
    WHERE id = NEW.user_id;

    -- Admin bebas tanpa batas
    IF user_role IN ('admin', 'superadmin') THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO current_count 
    FROM public.google_accounts 
    WHERE user_id = NEW.user_id;

    IF current_count >= COALESCE(max_limit, 5) THEN
        RAISE EXCEPTION 'Batas kuota akun Google (% akun) sudah tercapai untuk paket Anda.', max_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_google_accounts_limit ON public.google_accounts;
CREATE TRIGGER validate_google_accounts_limit
    BEFORE INSERT ON public.google_accounts
    FOR EACH ROW EXECUTE FUNCTION public.check_max_google_accounts();

-- 4. GENERATE JOBS TABLE (Task Queue)
CREATE TABLE IF NOT EXISTS public.generate_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_account_id UUID REFERENCES public.google_accounts(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    model TEXT DEFAULT 'Omni Flash' CHECK (model IN ('Omni Flash', 'Veo', 'Nano Banana')),
    ratio TEXT DEFAULT '9:16' CHECK (ratio IN ('9:16', '16:9', '1:1')),
    duration TEXT DEFAULT '8s',
    count INT DEFAULT 1 CHECK (count >= 1 AND count <= 4),
    hidden_browser BOOLEAN DEFAULT TRUE,
    
    -- Status Eksekusi Job
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INT DEFAULT 0,
    status_message TEXT DEFAULT 'Menunggu antrian server...',
    
    -- Hasil Generate & Cloudflare R2
    video_url TEXT,
    thumbnail_url TEXT,
    r2_key TEXT,
    error_message TEXT,
    
    worker_id TEXT, -- ID Worker (Local/VPS/Oracle) yang mengambil job
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index performa untuk antrian worker
CREATE INDEX IF NOT EXISTS idx_generate_jobs_status ON public.generate_jobs(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_generate_jobs_user ON public.generate_jobs(user_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generate_jobs ENABLE ROW LEVEL SECURITY;

-- Policy Profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy Google Accounts
CREATE POLICY "Users can view own google accounts" 
    ON public.google_accounts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google accounts" 
    ON public.google_accounts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google accounts" 
    ON public.google_accounts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google accounts" 
    ON public.google_accounts FOR DELETE 
    USING (auth.uid() = user_id);

-- Policy Generate Jobs
CREATE POLICY "Users can view own jobs" 
    ON public.generate_jobs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" 
    ON public.generate_jobs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" 
    ON public.generate_jobs FOR UPDATE 
    USING (auth.uid() = user_id);

-- Admin Global Policy (Bisa lihat & atur semua)
CREATE POLICY "Admin view all profiles" 
    ON public.profiles FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin view all accounts" 
    ON public.google_accounts FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin view all jobs" 
    ON public.generate_jobs FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Enable Realtime for generate_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.generate_jobs;
