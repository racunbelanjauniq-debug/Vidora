-- =========================================================================
-- VIDORA Production Database Schema (Supabase PostgreSQL)
-- Multi-Profile Google Studio with Admin Dashboard & xsender.id WA
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
    max_google_accounts INT DEFAULT 5, -- Maksimal 5 akun untuk user, 99999 untuk superadmin
    is_subscribed BOOLEAN DEFAULT FALSE, -- Status langganan Creator Pass
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;

-- Helper function to check if current user is admin without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_role TEXT;
BEGIN
    SELECT role INTO current_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN current_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger auto-insert profile saat user baru register di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT := 'user';
    acc_limit INT := 5;
    is_sub BOOLEAN := FALSE;
BEGIN
    -- Whitelist winalislam@gmail.com dan admin sebagai Super Admin permanen
    IF NEW.email = 'winalislam@gmail.com' OR NEW.email LIKE '%admin%' THEN
        user_role := 'superadmin';
        acc_limit := 99999;
        is_sub := TRUE;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, max_google_accounts, is_subscribed)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        user_role,
        acc_limit,
        is_sub
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        role = CASE WHEN EXCLUDED.email = 'winalislam@gmail.com' THEN 'superadmin' ELSE public.profiles.role END,
        max_google_accounts = CASE WHEN EXCLUDED.email = 'winalislam@gmail.com' THEN 99999 ELSE public.profiles.max_google_accounts END,
        is_subscribed = CASE WHEN EXCLUDED.email = 'winalislam@gmail.com' THEN TRUE ELSE public.profiles.is_subscribed END,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. GOOGLE PROFILES TABLE (Multi-Profile Vault, Max 5 Akun)
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

-- Enforce Strict Limit: Maksimal 5 Profil Akun Google per User (Kecuali Admin)
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

    -- Super Admin bebas tanpa batas
    IF user_role IN ('admin', 'superadmin') THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO current_count 
    FROM public.google_accounts 
    WHERE user_id = NEW.user_id;

    IF current_count >= COALESCE(max_limit, 5) THEN
        RAISE EXCEPTION 'Batas kuota akun Google (% akun) sudah tercapai untuk paket Creator Anda.', COALESCE(max_limit, 5);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_google_accounts_limit ON public.google_accounts;
CREATE TRIGGER validate_google_accounts_limit
    BEFORE INSERT ON public.google_accounts
    FOR EACH ROW EXECUTE FUNCTION public.check_max_google_accounts();

-- 4. ORDERS & SUBSCRIPTIONS (Checkout Rp 75.000 / bln)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Format: INV-VID-XXXX
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    plan_name TEXT DEFAULT 'VIDORA Creator Pass' NOT NULL,
    price INT DEFAULT 75000 NOT NULL,
    payment_method TEXT DEFAULT 'QRIS' CHECK (payment_method IN ('QRIS', 'BANK', 'WHATSAPP', 'PAKASIR', 'qris_pakasir', 'manual_transfer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected', 'expired')),
    pakasir_payload JSONB DEFAULT '{}'::jsonb,
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pakasir_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('QRIS', 'BANK', 'WHATSAPP', 'PAKASIR', 'qris_pakasir', 'manual_transfer'));

-- Trigger auto-upgrade profile saat order status diubah jadi 'paid'
CREATE OR REPLACE FUNCTION public.handle_order_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
        IF NEW.user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET max_google_accounts = 5,
                is_subscribed = TRUE,
                updated_at = now()
            WHERE id = NEW.user_id;
        ELSIF NEW.customer_email IS NOT NULL THEN
            UPDATE public.profiles
            SET max_google_accounts = 5,
                is_subscribed = TRUE,
                updated_at = now()
            WHERE email = NEW.customer_email;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_paid_update_profile ON public.orders;
CREATE TRIGGER on_order_paid_update_profile
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_paid();

-- 5. GENERATE JOBS TABLE (Task Queue Video & Image)
CREATE TABLE IF NOT EXISTS public.generate_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_account_id UUID REFERENCES public.google_accounts(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    model TEXT DEFAULT 'Omni Flash',
    ratio TEXT DEFAULT '9:16',
    duration TEXT DEFAULT '8s',
    count INT DEFAULT 1,
    hidden_browser BOOLEAN DEFAULT TRUE,
    
    -- Status Eksekusi Job
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INT DEFAULT 0,
    status_message TEXT DEFAULT 'Menunggu antrian server...',
    
    -- Hasil Render & Cloudflare R2
    video_url TEXT,
    thumbnail_url TEXT,
    r2_key TEXT,
    error_message TEXT,
    
    worker_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_generate_jobs_status ON public.generate_jobs(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_generate_jobs_user ON public.generate_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status, created_at DESC);

-- 6. SYSTEM SETTINGS (Untuk integrasi xsender.id, Cloudflare R2, WhatsApp Templates)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Default Konfigurasi xsender.id WhatsApp Gateway
INSERT INTO public.system_settings (key, value)
VALUES (
    'xsender_config',
    '{
        "api_url": "https://api.xsender.id/v1/messages",
        "api_token": "",
        "device_id": "",
        "admin_phone": "081234567890",
        "notify_on_order": true,
        "notify_on_approval": true,
        "notify_on_render": true,
        "template_order": "Halo {nama}, terima kasih! Pesanan {paket} ({invoice}) sebesar Rp {total} telah kami terima. Silakan selesaikan pembayaran untuk aktivasi akun.",
        "template_approval": "Selamat {nama}! Pembayaran Anda untuk {paket} ({invoice}) telah disetujui. Akun 5 Profil Google Anda kini telah AKTIF. Silakan buka studio di https://vidora.biz.id/app.html",
        "template_render": "Halo {nama}, render video AI produk Anda telah SELESAI! Unduh video Anda di galeri: {link_video}"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES (
    'pakasir_config',
    '{
        "slug": "vidora",
        "api_key": "",
        "is_active": true,
        "webhook_url": "https://vidora.biz.id/api/webhook-pakasir"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generate_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
CREATE POLICY "Admin view all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Google Accounts Policies
DROP POLICY IF EXISTS "Users can view own google accounts" ON public.google_accounts;
CREATE POLICY "Users can view own google accounts" ON public.google_accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own google accounts" ON public.google_accounts;
CREATE POLICY "Users can insert own google accounts" ON public.google_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own google accounts" ON public.google_accounts;
CREATE POLICY "Users can update own google accounts" ON public.google_accounts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own google accounts" ON public.google_accounts;
CREATE POLICY "Users can delete own google accounts" ON public.google_accounts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin view all accounts" ON public.google_accounts;
CREATE POLICY "Admin view all accounts" ON public.google_accounts FOR ALL USING (public.is_admin());

-- Orders Policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage all orders" ON public.orders;
CREATE POLICY "Admin manage all orders" ON public.orders FOR ALL USING (public.is_admin());

-- Generate Jobs Policies
DROP POLICY IF EXISTS "Users can view own jobs" ON public.generate_jobs;
CREATE POLICY "Users can view own jobs" ON public.generate_jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON public.generate_jobs;
CREATE POLICY "Users can insert own jobs" ON public.generate_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON public.generate_jobs;
CREATE POLICY "Users can update own jobs" ON public.generate_jobs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin view all jobs" ON public.generate_jobs;
CREATE POLICY "Admin view all jobs" ON public.generate_jobs FOR ALL USING (public.is_admin());

-- System Settings Policies
DROP POLICY IF EXISTS "Admin manage system settings" ON public.system_settings;
CREATE POLICY "Admin manage system settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- 8. HELPER FUNCTION: PROMOTE USER TO SUPER ADMIN
-- Owner cukup jalankan: SELECT public.promote_to_admin('email_anda@gmail.com');
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
    matched_id UUID;
BEGIN
    SELECT id INTO matched_id FROM public.profiles WHERE email = target_email;
    IF matched_id IS NULL THEN
        RETURN 'User dengan email tersebut belum terdaftar di profiles.';
    END IF;
    
    UPDATE public.profiles
    SET role = 'superadmin',
        max_google_accounts = 99999,
        updated_at = now()
    WHERE id = matched_id;
    
    RETURN 'Sukses! ' || target_email || ' kini adalah SUPER ADMIN dengan akses penuh.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.generate_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 9. EKSEKUSI OTOMATIS: JADIKAN winalislam@gmail.com SUPER ADMIN
DO $$
BEGIN
    PERFORM public.promote_to_admin('winalislam@gmail.com');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

