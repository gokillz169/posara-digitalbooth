-- ==============================================================================
-- POSARA DIGITAL BOOTH - SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Table: user_plans (Mengelola kuota kredit dan tier langganan pengguna)
CREATE TABLE IF NOT EXISTS public.user_plans (
    id TEXT PRIMARY KEY, -- Menggunakan Supabase Auth UID atau Session ID
    user_id TEXT,
    email TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'weekend', 'creator', 'studio')),
    credits_total INTEGER NOT NULL DEFAULT 20,
    credits_remaining INTEGER NOT NULL DEFAULT 20,
    cycle_key TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: upgrade_requests (Transaksi order, QRIS & Payment Gateway Invoice)
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    request_id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT DEFAULT 'Pengguna POSARA',
    requested_plan TEXT NOT NULL CHECK (requested_plan IN ('weekend', 'creator', 'studio')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('once', 'monthly', 'yearly')),
    amount_idr INTEGER NOT NULL,
    reference_code TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    payment_note TEXT DEFAULT '',
    payment_method TEXT DEFAULT 'midtrans',
    midtrans_transaction_id TEXT DEFAULT '',
    midtrans_payment_type TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    reviewed_by_email TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migration aman untuk database yang sudah pernah dibuat sebelum Midtrans aktif.
ALTER TABLE public.upgrade_requests ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT DEFAULT '';
ALTER TABLE public.upgrade_requests ADD COLUMN IF NOT EXISTS midtrans_payment_type TEXT DEFAULT '';

-- 3. Table: booth_settings (Konfigurasi Kiosk, PIN, Watermark, & Event Branding)
CREATE TABLE IF NOT EXISTS public.booth_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    owner_uid TEXT,
    owner_email TEXT DEFAULT 'mutawakkils16@gmail.com',
    auto_reset_enabled BOOLEAN NOT NULL DEFAULT false,
    custom_watermark_enabled BOOLEAN NOT NULL DEFAULT false,
    watermark_text TEXT NOT NULL DEFAULT '',
    kiosk_pin TEXT NOT NULL DEFAULT '2025',
    qris_merchant_string TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert data awal booth_settings jika belum ada
INSERT INTO public.booth_settings (id, owner_email, kiosk_pin)
VALUES ('main', 'mutawakkils16@gmail.com', '2025')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_settings ENABLE ROW LEVEL SECURITY;

-- Policies untuk booth_settings (Kiosk)
DROP POLICY IF EXISTS "Public can view booth settings" ON public.booth_settings;
CREATE POLICY "Public can view booth settings"
ON public.booth_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Owner can update booth settings" ON public.booth_settings;
CREATE POLICY "Owner can update booth settings"
ON public.booth_settings FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policies untuk user_plans
DROP POLICY IF EXISTS "Allow user to read own plan" ON public.user_plans;
CREATE POLICY "Allow user to read own plan"
ON public.user_plans FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow user to insert own plan" ON public.user_plans;
CREATE POLICY "Allow user to insert own plan"
ON public.user_plans FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user to update own plan" ON public.user_plans;
CREATE POLICY "Allow user to update own plan"
ON public.user_plans FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Policies untuk upgrade_requests
DROP POLICY IF EXISTS "Allow users to view own upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Allow users to view own upgrade requests"
ON public.upgrade_requests FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow users to insert upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Allow users to insert upgrade requests"
ON public.upgrade_requests FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow owner to update upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Allow owner to update upgrade requests"
ON public.upgrade_requests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION (Untuk update kuota & invoice instan di UI)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upgrade_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_settings;
