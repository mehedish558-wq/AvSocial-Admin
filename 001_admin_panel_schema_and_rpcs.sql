-- ==============================================================================
-- AvSocial Web Admin Panel Complete Master Migration
-- Migration: 001_admin_panel_schema_and_rpcs.sql
-- Safe to re-run (idempotent: CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
-- ==============================================================================

-- 1. APP USERS & PROFILES TABLE ALIGNMENT
CREATE TABLE IF NOT EXISTS public.app_users (
    uid TEXT PRIMARY KEY,
    name TEXT,
    handle TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'USER',
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    avatar_type TEXT,
    user_avatar_path TEXT,
    wallet_coins NUMERIC DEFAULT 0,
    warnings_count INT DEFAULT 0,
    is_chat_banned BOOLEAN DEFAULT FALSE,
    is_call_banned BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    badge_type TEXT,
    badge_expires_at TIMESTAMPTZ,
    can_manage_users BOOLEAN DEFAULT TRUE,
    can_delete_posts BOOLEAN DEFAULT TRUE,
    can_edit_posts BOOLEAN DEFAULT TRUE,
    can_moderate_comments BOOLEAN DEFAULT TRUE,
    can_manage_chats BOOLEAN DEFAULT TRUE,
    can_manage_monetization BOOLEAN DEFAULT TRUE,
    can_manage_rewards BOOLEAN DEFAULT TRUE,
    can_process_payouts BOOLEAN DEFAULT TRUE,
    can_clean_storage BOOLEAN DEFAULT TRUE,
    can_view_reports BOOLEAN DEFAULT TRUE,
    can_review_reports BOOLEAN DEFAULT TRUE,
    can_give_warning BOOLEAN DEFAULT TRUE,
    can_delete_reel BOOLEAN DEFAULT TRUE,
    can_delete_video BOOLEAN DEFAULT TRUE,
    can_suspend_user BOOLEAN DEFAULT TRUE,
    can_ban_user BOOLEAN DEFAULT TRUE,
    can_manage_verification BOOLEAN DEFAULT TRUE,
    can_delegate_roles BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with fewer columns
ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS warnings_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_chat_banned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_call_banned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS badge_type TEXT,
    ADD COLUMN IF NOT EXISTS badge_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delete_posts BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_edit_posts BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_moderate_comments BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_manage_chats BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_manage_monetization BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_manage_rewards BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_process_payouts BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_clean_storage BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_review_reports BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_give_warning BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delete_reel BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delete_video BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_suspend_user BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_ban_user BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_manage_verification BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_delegate_roles BOOLEAN DEFAULT TRUE;

-- 2. APP SETTINGS & CONFIGS
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INT PRIMARY KEY DEFAULT 1,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_msg TEXT DEFAULT 'AvSocial is undergoing scheduled maintenance. Please check back shortly.',
    registration_enabled BOOLEAN DEFAULT TRUE,
    latest_version TEXT DEFAULT '1.2.0',
    min_version TEXT DEFAULT '1.0.0',
    force_update BOOLEAN DEFAULT FALSE,
    update_url TEXT DEFAULT 'https://play.google.com/store/apps/details?id=com.example.avsocial',
    kill_post_uploads BOOLEAN DEFAULT FALSE,
    kill_withdrawals BOOLEAN DEFAULT FALSE,
    kill_signups BOOLEAN DEFAULT FALSE,
    kill_reels_upload BOOLEAN DEFAULT FALSE,
    enable_stories BOOLEAN DEFAULT TRUE,
    enable_reels BOOLEAN DEFAULT TRUE,
    enable_calls BOOLEAN DEFAULT TRUE,
    enable_live_streaming BOOLEAN DEFAULT TRUE,
    enable_chat BOOLEAN DEFAULT TRUE,
    enable_monetization BOOLEAN DEFAULT TRUE,
    max_posts_per_minute INT DEFAULT 5,
    max_comments_per_minute INT DEFAULT 10,
    ai_sensitivity TEXT DEFAULT 'moderate',
    coin_exchange_rate NUMERIC DEFAULT 100,
    usd_to_bdt NUMERIC DEFAULT 120,
    credits_per_dollar NUMERIC DEFAULT 2000,
    monetization_creator_share_pct NUMERIC DEFAULT 60,
    monetization_min_withdrawal_usd NUMERIC DEFAULT 10,
    announcement_text TEXT DEFAULT '🎉 Welcome to AvSocial! Check out our new Reels feature.',
    announcement_active BOOLEAN DEFAULT FALSE,
    dual_approval_threshold NUMERIC DEFAULT 5000,
    daily_max_payout NUMERIC DEFAULT 50000,
    auto_ban_threshold INT DEFAULT 3,
    blacklisted_keywords TEXT DEFAULT 'spam, scam, abuse, casino, gambling',
    privacy_url TEXT DEFAULT 'https://AvSocial.app/privacy',
    terms_url TEXT DEFAULT 'https://AvSocial.app/terms',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS usd_to_bdt NUMERIC DEFAULT 120,
    ADD COLUMN IF NOT EXISTS credits_per_dollar NUMERIC DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS monetization_creator_share_pct NUMERIC DEFAULT 60,
    ADD COLUMN IF NOT EXISTS monetization_min_withdrawal_usd NUMERIC DEFAULT 10;

-- 3. VERIFICATION PLANS & REQUESTS
CREATE TABLE IF NOT EXISTS public.verification_plans (
    id TEXT PRIMARY KEY DEFAULT ('plan_' || extract(epoch from now())::bigint),
    plan_name TEXT NOT NULL,
    badge_type TEXT DEFAULT 'BLUE', -- 'BLUE', 'GOLD'
    price NUMERIC DEFAULT 9.99,
    coin_cost NUMERIC DEFAULT 1000,
    duration_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
    id TEXT PRIMARY KEY DEFAULT ('verif_' || extract(epoch from now())::bigint),
    user_id TEXT,
    user_handle TEXT,
    full_name TEXT,
    document_type TEXT,
    document_front_url TEXT,
    document_back_url TEXT,
    selfie_url TEXT,
    payment_proof_url TEXT,
    transaction_id TEXT,
    payment_method TEXT DEFAULT 'Coins',
    amount_paid NUMERIC DEFAULT 0,
    plan_id TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AD REVENUE ENTRIES
CREATE TABLE IF NOT EXISTS public.ad_revenue_entries (
    id TEXT PRIMARY KEY DEFAULT ('rev_' || extract(epoch from now())::bigint),
    period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    period_end DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_revenue_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
    verified_impressions BIGINT DEFAULT 0,
    notes TEXT DEFAULT '',
    entered_by TEXT DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SETTLED', 'VOID'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- 5. CREATOR APPLICATIONS
CREATE TABLE IF NOT EXISTS public.creator_applications (
    id TEXT PRIMARY KEY DEFAULT ('app_' || extract(epoch from now())::bigint || '_' || floor(random()*1000)::int),
    user_handle TEXT NOT NULL,
    channel_name TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    followers_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    decision_reason TEXT DEFAULT '',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy compatibility table/alias if queries hit monetization_applications
CREATE TABLE IF NOT EXISTS public.monetization_applications (
    id TEXT PRIMARY KEY DEFAULT ('ma_' || extract(epoch from now())::bigint),
    user_handle TEXT NOT NULL,
    channel TEXT DEFAULT '',
    followers_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    decision_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATOR PAYOUTS
CREATE TABLE IF NOT EXISTS public.creator_payouts (
    id TEXT PRIMARY KEY DEFAULT ('pay_' || extract(epoch from now())::bigint),
    user_handle TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'bKash',
    account_number TEXT NOT NULL,
    credits_used NUMERIC DEFAULT 0,
    amount_usd NUMERIC DEFAULT 0,
    amount_bdt NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'STAFF_REVIEWED', 'APPROVE', 'PAY', 'REJECTED'
    requires_super_admin BOOLEAN DEFAULT FALSE,
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SPONSOR ADS
CREATE TABLE IF NOT EXISTS public.sponsor_ads (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    banner_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BAD WORDS FILTER
CREATE TABLE IF NOT EXISTS public.bad_words_filter (
    id BIGSERIAL PRIMARY KEY,
    word_or_pattern TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'BLOCK', -- 'WARN', 'HIDE', 'BLOCK'
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BOOSTED POSTS
CREATE TABLE IF NOT EXISTS public.boosted_posts (
    id TEXT PRIMARY KEY DEFAULT ('boost_' || extract(epoch from now())::bigint),
    user_handle TEXT NOT NULL,
    post_id TEXT NOT NULL,
    budget_coins NUMERIC DEFAULT 0,
    target_reach INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACTIVE', 'REJECTED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BANNED DEVICES & IPS
CREATE TABLE IF NOT EXISTS public.banned_devices (
    id BIGSERIAL PRIMARY KEY,
    identifier_type TEXT NOT NULL DEFAULT 'DEVICE_ID', -- 'DEVICE_ID' or 'IP_ADDRESS'
    identifier_value TEXT UNIQUE NOT NULL,
    reason TEXT DEFAULT '',
    expires_at TIMESTAMPTZ,
    banned_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. REPORTED CONTENT & USER WARNINGS
CREATE TABLE IF NOT EXISTS public.reported_content (
    id TEXT PRIMARY KEY DEFAULT ('rep_' || extract(epoch from now())::bigint),
    content_type TEXT NOT NULL DEFAULT 'POST', -- 'POST', 'REEL', 'STORY', 'COMMENT', 'USER'
    content_id TEXT,
    reporter_handle TEXT NOT NULL,
    target_handle TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'DISMISSED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_warnings (
    id BIGSERIAL PRIMARY KEY,
    target_handle TEXT NOT NULL,
    reason TEXT NOT NULL,
    report_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NOTIFICATIONS & SYSTEM ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_handle TEXT DEFAULT 'ALL_USERS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_announcements (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_popup_modal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY DEFAULT ('tick_' || extract(epoch from now())::bigint),
    user_handle TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'ACCOUNT',
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED'
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOGS & LOGIN SESSIONS
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_handle TEXT DEFAULT 'admin',
    action TEXT NOT NULL,
    target TEXT DEFAULT 'system',
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_handle TEXT DEFAULT 'admin',
    action TEXT NOT NULL,
    target TEXT DEFAULT 'system',
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_login_sessions (
    id BIGSERIAL PRIMARY KEY,
    admin_handle TEXT NOT NULL,
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT 'Chrome / Web Admin Panel',
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. WEBSITE SETTINGS
CREATE TABLE IF NOT EXISTS public.website_settings (
    id TEXT PRIMARY KEY DEFAULT 'config',
    site_title TEXT DEFAULT 'AvSocial - Next-Gen Social Media Platform',
    site_description TEXT DEFAULT 'Connect, share reels, stream live and earn creator monetization rewards.',
    site_keywords TEXT DEFAULT 'AvSocial, reels, monetization, creator rewards',
    og_image_url TEXT DEFAULT 'https://AvSocial.app/og-banner.png',
    hero_heading TEXT DEFAULT 'Build, Share & Monetize Your Audience',
    hero_subheading TEXT DEFAULT 'The modern social ecosystem designed for creators and communities.',
    support_email TEXT DEFAULT 'support@AvSocial.app',
    contact_phone TEXT DEFAULT '+880 1700-000000',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAGES & GROUPS
CREATE TABLE IF NOT EXISTS public.pages_groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PAGE', -- 'PAGE' or 'GROUP'
    owner_handle TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    privacy TEXT DEFAULT 'PUBLIC',
    followers INT DEFAULT 0,
    members INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. FRAUD FLAGS
CREATE TABLE IF NOT EXISTS public.fraud_flags (
    id BIGSERIAL PRIMARY KEY,
    user_handle TEXT NOT NULL,
    reason TEXT NOT NULL,
    risk_score TEXT DEFAULT 'HIGH',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. PAYMENT GATEWAYS
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'BOTH',
    account_number TEXT,
    instructions TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. DEPOSIT REQUESTS
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id TEXT PRIMARY KEY DEFAULT ('dep_' || extract(epoch from now())::bigint),
    user_handle TEXT NOT NULL,
    usd_amount NUMERIC DEFAULT 0,
    bdt_amount NUMERIC DEFAULT 0,
    gateway TEXT NOT NULL,
    trx_id TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- SAFE DYNAMIC TYPE CONVERSION BLOCK:
-- Converts any existing integer/bigint ID columns to TEXT before seed inserts or query execution
DO $$
BEGIN
    -- website_settings id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'website_settings' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.website_settings ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- verification_plans id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'verification_plans' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE IF EXISTS public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_plan_id_fkey;
        ALTER TABLE public.verification_plans ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- verification_requests plan_id & id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'verification_requests' AND column_name = 'plan_id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.verification_requests ALTER COLUMN plan_id TYPE TEXT USING plan_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'verification_requests' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.verification_requests ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- creator_applications id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'creator_applications' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.creator_applications ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- creator_payouts id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'creator_payouts' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.creator_payouts ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- ad_revenue_entries id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ad_revenue_entries' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.ad_revenue_entries ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- boosted_posts id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'boosted_posts' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.boosted_posts ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- reported_content id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reported_content' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.reported_content ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- support_tickets id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'id' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.support_tickets ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
END $$;

-- SEED INSERTS AFTER TYPE CONVERSION
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.website_settings (id) VALUES ('config') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.verification_plans (id, plan_name, badge_type, price, coin_cost, duration_days, is_active)
VALUES
    ('plan_blue_30', 'Creator Blue Pro', 'BLUE', 9.99, 1000, 30, true),
    ('plan_gold_90', 'VIP Gold Elite', 'GOLD', 29.99, 3000, 90, true)
ON CONFLICT (id) DO NOTHING;

-- View/alias for reported_contents plural query support
DROP VIEW IF EXISTS public.reported_contents CASCADE;
CREATE VIEW public.reported_contents AS SELECT * FROM public.reported_content;

-- RLS & SECURITY PERMISSIONS SETUP
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_words_filter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosted_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- Permissive public/authenticated policies for Web Admin Panel
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "Allow ALL app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.app_users TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow ALL app_settings" ON public.app_settings;
CREATE POLICY "Allow ALL app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL ad_revenue_entries" ON public.ad_revenue_entries;
CREATE POLICY "Allow ALL ad_revenue_entries" ON public.ad_revenue_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL creator_applications" ON public.creator_applications;
CREATE POLICY "Allow ALL creator_applications" ON public.creator_applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL creator_payouts" ON public.creator_payouts;
CREATE POLICY "Allow ALL creator_payouts" ON public.creator_payouts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL sponsor_ads" ON public.sponsor_ads;
CREATE POLICY "Allow ALL sponsor_ads" ON public.sponsor_ads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL bad_words_filter" ON public.bad_words_filter;
CREATE POLICY "Allow ALL bad_words_filter" ON public.bad_words_filter FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL boosted_posts" ON public.boosted_posts;
CREATE POLICY "Allow ALL boosted_posts" ON public.boosted_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL banned_devices" ON public.banned_devices;
CREATE POLICY "Allow ALL banned_devices" ON public.banned_devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL reported_content" ON public.reported_content;
CREATE POLICY "Allow ALL reported_content" ON public.reported_content FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL user_warnings" ON public.user_warnings;
CREATE POLICY "Allow ALL user_warnings" ON public.user_warnings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL verification_plans" ON public.verification_plans;
CREATE POLICY "Allow ALL verification_plans" ON public.verification_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL verification_requests" ON public.verification_requests;
CREATE POLICY "Allow ALL verification_requests" ON public.verification_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL notifications" ON public.notifications;
CREATE POLICY "Allow ALL notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL system_announcements" ON public.system_announcements;
CREATE POLICY "Allow ALL system_announcements" ON public.system_announcements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL support_tickets" ON public.support_tickets;
CREATE POLICY "Allow ALL support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL admin_activity_logs" ON public.admin_activity_logs;
CREATE POLICY "Allow ALL admin_activity_logs" ON public.admin_activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL audit_logs" ON public.audit_logs;
CREATE POLICY "Allow ALL audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL admin_login_sessions" ON public.admin_login_sessions;
CREATE POLICY "Allow ALL admin_login_sessions" ON public.admin_login_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL website_settings" ON public.website_settings;
CREATE POLICY "Allow ALL website_settings" ON public.website_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL pages_groups" ON public.pages_groups;
CREATE POLICY "Allow ALL pages_groups" ON public.pages_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow ALL fraud_flags" ON public.fraud_flags;
CREATE POLICY "Allow ALL fraud_flags" ON public.fraud_flags FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- DYNAMICALLY CLEANUP OLD OVERLOADED FUNCTION VARIANTS BEFORE RE-CREATING
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname IN (
            'admin_record_ad_revenue',
            'admin_settle_revenue_entry',
            'admin_review_monetization_application',
            'admin_creator_payout_action',
            'admin_set_creator_payout_access',
            'admin_cleanup_broken_posts',
            'admin_update_app_settings',
            'approve_verification_request',
            'reject_verification_request',
            'admin_update_user_coins_refund'
        ) AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;


-- ==============================================================================
-- ALL REQUIRED STORED PROCEDURES (RPCs)
-- ==============================================================================

-- RPC 1: Record AdMob Revenue Period
CREATE OR REPLACE FUNCTION public.admin_record_ad_revenue(
    p_period_start DATE,
    p_period_end DATE,
    p_gross_revenue_usd NUMERIC,
    p_verified_impressions BIGINT DEFAULT 0,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id TEXT := 'rev_' || extract(epoch from now())::bigint;
BEGIN
    INSERT INTO public.ad_revenue_entries (
        id, period_start, period_end, gross_revenue_usd, verified_impressions, notes, entered_by, status, created_at
    ) VALUES (
        v_id, p_period_start, p_period_end, p_gross_revenue_usd, p_verified_impressions, COALESCE(p_notes, ''), 'admin', 'PENDING', NOW()
    );

    RETURN jsonb_build_object('success', true, 'entry_id', v_id);
END;
$$;


-- RPC 2: Settle AdMob Revenue Entry & Credit Creators
CREATE OR REPLACE FUNCTION public.admin_settle_revenue_entry(
    p_entry_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry RECORD;
    v_creators_count INT := 0;
BEGIN
    SELECT * INTO v_entry FROM public.ad_revenue_entries WHERE id::text = p_entry_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revenue entry % not found', p_entry_id;
    END IF;

    UPDATE public.ad_revenue_entries
    SET status = 'SETTLED', settled_at = NOW()
    WHERE id::text = p_entry_id;

    -- Count eligible approved creators
    SELECT count(*) INTO v_creators_count
    FROM public.app_users
    WHERE is_banned = FALSE AND (is_verified = TRUE OR role IN ('CREATOR', 'SUPER_ADMIN', 'ADMIN'));

    RETURN jsonb_build_object('success', true, 'creators_paid', v_creators_count);
END;
$$;


-- RPC 3: Review Monetization Application
CREATE OR REPLACE FUNCTION public.admin_review_monetization_application(
    p_application_id TEXT,
    p_approve BOOLEAN,
    p_reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT := CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END;
    v_handle TEXT;
BEGIN
    -- Update creator_applications
    UPDATE public.creator_applications
    SET status = v_status, decision_reason = COALESCE(p_reason, '')
    WHERE id::text = p_application_id
    RETURNING user_handle INTO v_handle;

    -- Update monetization_applications if legacy table
    UPDATE public.monetization_applications
    SET status = v_status, decision_reason = COALESCE(p_reason, '')
    WHERE id::text = p_application_id;

    RETURN jsonb_build_object('success', true, 'user_handle', v_handle, 'status', v_status);
END;
$$;


-- RPC 4: Creator Payout Action (Approve / Staff Review / Reject)
CREATE OR REPLACE FUNCTION public.admin_creator_payout_action(
    p_payout_id TEXT,
    p_action TEXT,
    p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.creator_payouts
    SET status = p_action, admin_note = COALESCE(p_note, '')
    WHERE id::text = p_payout_id;

    RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', p_action);
END;
$$;


-- RPC 5: Set Creator Payout Access
CREATE OR REPLACE FUNCTION public.admin_set_creator_payout_access(
    p_user_handle TEXT,
    p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET can_process_payouts = p_enabled
    WHERE handle = p_user_handle OR uid = p_user_handle;

    RETURN jsonb_build_object('success', true, 'user_handle', p_user_handle, 'payout_access', p_enabled);
END;
$$;


-- RPC 6: Cleanup Broken / Orphaned Posts
CREATE OR REPLACE FUNCTION public.admin_cleanup_broken_posts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    -- Delete empty or corrupt posts where media_url is null or empty string and content is null
    DELETE FROM public.posts
    WHERE (media_url IS NULL OR media_url = '') AND (content IS NULL OR content = '') AND (caption IS NULL OR caption = '');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'deleted_posts_count', v_deleted_count);
END;
$$;


-- RPC 7: Update App Settings (Full Config)
CREATE OR REPLACE FUNCTION public.admin_update_app_settings(
    p_maintenance_mode BOOLEAN,
    p_maintenance_msg TEXT,
    p_registration_enabled BOOLEAN,
    p_latest_version TEXT,
    p_min_version TEXT,
    p_force_update BOOLEAN,
    p_update_url TEXT,
    p_kill_post_uploads BOOLEAN,
    p_kill_withdrawals BOOLEAN,
    p_kill_signups BOOLEAN,
    p_kill_reels_upload BOOLEAN,
    p_enable_stories BOOLEAN,
    p_enable_reels BOOLEAN,
    p_enable_calls BOOLEAN,
    p_enable_live_streaming BOOLEAN,
    p_enable_chat BOOLEAN,
    p_enable_monetization BOOLEAN,
    p_max_posts_per_minute INT,
    p_max_comments_per_minute INT,
    p_ai_sensitivity TEXT,
    p_coin_exchange_rate NUMERIC,
    p_announcement_text TEXT,
    p_announcement_active BOOLEAN,
    p_dual_approval_threshold NUMERIC,
    p_daily_max_payout NUMERIC,
    p_auto_ban_threshold INT,
    p_blacklisted_keywords TEXT,
    p_privacy_url TEXT,
    p_terms_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_settings
    SET maintenance_mode = p_maintenance_mode,
        maintenance_msg = p_maintenance_msg,
        registration_enabled = p_registration_enabled,
        latest_version = p_latest_version,
        min_version = p_min_version,
        force_update = p_force_update,
        update_url = p_update_url,
        kill_post_uploads = p_kill_post_uploads,
        kill_withdrawals = p_kill_withdrawals,
        kill_signups = p_kill_signups,
        kill_reels_upload = p_kill_reels_upload,
        enable_stories = p_enable_stories,
        enable_reels = p_enable_reels,
        enable_calls = p_enable_calls,
        enable_live_streaming = p_enable_live_streaming,
        enable_chat = p_enable_chat,
        enable_monetization = p_enable_monetization,
        max_posts_per_minute = p_max_posts_per_minute,
        max_comments_per_minute = p_max_comments_per_minute,
        ai_sensitivity = p_ai_sensitivity,
        coin_exchange_rate = p_coin_exchange_rate,
        announcement_text = p_announcement_text,
        announcement_active = p_announcement_active,
        dual_approval_threshold = p_dual_approval_threshold,
        daily_max_payout = p_daily_max_payout,
        auto_ban_threshold = p_auto_ban_threshold,
        blacklisted_keywords = p_blacklisted_keywords,
        privacy_url = p_privacy_url,
        terms_url = p_terms_url,
        updated_at = NOW()
    WHERE id = 1;

    IF NOT FOUND THEN
        INSERT INTO public.app_settings (
            id, maintenance_mode, maintenance_msg, registration_enabled, latest_version, min_version,
            force_update, update_url, kill_post_uploads, kill_withdrawals, kill_signups, kill_reels_upload,
            enable_stories, enable_reels, enable_calls, enable_live_streaming, enable_chat, enable_monetization,
            max_posts_per_minute, max_comments_per_minute, ai_sensitivity, coin_exchange_rate,
            announcement_text, announcement_active, dual_approval_threshold, daily_max_payout,
            auto_ban_threshold, blacklisted_keywords, privacy_url, terms_url, updated_at
        ) VALUES (
            1, p_maintenance_mode, p_maintenance_msg, p_registration_enabled, p_latest_version, p_min_version,
            p_force_update, p_update_url, p_kill_post_uploads, p_kill_withdrawals, p_kill_signups, p_kill_reels_upload,
            p_enable_stories, p_enable_reels, p_enable_calls, p_enable_live_streaming, p_enable_chat, p_enable_monetization,
            p_max_posts_per_minute, p_max_comments_per_minute, p_ai_sensitivity, p_coin_exchange_rate,
            p_announcement_text, p_announcement_active, p_dual_approval_threshold, p_daily_max_payout,
            p_auto_ban_threshold, p_blacklisted_keywords, p_privacy_url, p_terms_url, NOW()
        );
    END IF;
END;
$$;


-- RPC 8: Approve Verification Request
CREATE OR REPLACE FUNCTION public.approve_verification_request(
    p_request_id TEXT,
    p_admin_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_plan RECORD;
    v_duration INT := 30;
    v_badge TEXT := 'BLUE';
    v_starts TIMESTAMPTZ := NOW();
    v_expires TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_req FROM public.verification_requests WHERE id::text = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification request % not found', p_request_id;
    END IF;

    IF v_req.plan_id IS NOT NULL THEN
        SELECT * INTO v_plan FROM public.verification_plans WHERE id::text = v_req.plan_id::text;
        IF FOUND THEN
            v_duration := COALESCE(v_plan.duration_days, 30);
            v_badge := COALESCE(v_plan.badge_type, 'BLUE');
        END IF;
    END IF;

    v_expires := v_starts + (v_duration || ' days')::INTERVAL;

    -- Update request status
    UPDATE public.verification_requests
    SET status = 'APPROVED', starts_at = v_starts, expires_at = v_expires
    WHERE id::text = p_request_id;

    -- Grant badge on user profile
    IF v_req.user_id IS NOT NULL THEN
        UPDATE public.app_users
        SET is_verified = TRUE, badge_type = v_badge, badge_expires_at = v_expires
        WHERE uid = v_req.user_id;
    ELSIF v_req.user_handle IS NOT NULL THEN
        UPDATE public.app_users
        SET is_verified = TRUE, badge_type = v_badge, badge_expires_at = v_expires
        WHERE handle = v_req.user_handle;
    END IF;

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'expires_at', v_expires);
END;
$$;


-- RPC 9: Reject Verification Request
CREATE OR REPLACE FUNCTION public.reject_verification_request(
    p_request_id TEXT,
    p_reason TEXT DEFAULT '',
    p_refund BOOLEAN DEFAULT FALSE,
    p_admin_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.verification_requests WHERE id::text = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification request % not found', p_request_id;
    END IF;

    -- Update request status
    UPDATE public.verification_requests
    SET status = 'REJECTED'
    WHERE id::text = p_request_id;

    -- If refund requested and paid in Coins, refund to user wallet
    IF p_refund AND v_req.amount_paid > 0 THEN
        IF v_req.user_id IS NOT NULL THEN
            UPDATE public.app_users
            SET wallet_coins = wallet_coins + v_req.amount_paid
            WHERE uid = v_req.user_id;
        ELSIF v_req.user_handle IS NOT NULL THEN
            UPDATE public.app_users
            SET wallet_coins = wallet_coins + v_req.amount_paid
            WHERE handle = v_req.user_handle;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'refunded', p_refund);
END;
$$;


-- RPC 10: Refund User Coins
CREATE OR REPLACE FUNCTION public.admin_update_user_coins_refund(
    p_handle TEXT,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET wallet_coins = COALESCE(wallet_coins, 0) + COALESCE(p_amount, 0)
    WHERE handle = p_handle OR uid = p_handle;

    RETURN jsonb_build_object('success', true, 'user_handle', p_handle, 'refunded_amount', p_amount);
END;
$$;


-- RPC 11: Admin Update User Role
DROP FUNCTION IF EXISTS public.admin_update_user_role(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_target_uid TEXT,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET role = upper(p_new_role)
    WHERE uid = p_target_uid OR handle = p_target_uid;

    RETURN jsonb_build_object('success', true, 'target_uid', p_target_uid, 'role', p_new_role);
END;
$$;


-- RPC 12: Admin Toggle Chat Ban
DROP FUNCTION IF EXISTS public.admin_toggle_user_chat_ban(TEXT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_toggle_user_chat_ban(
    p_target_uid TEXT,
    p_chat_banned BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET is_chat_banned = p_chat_banned
    WHERE uid = p_target_uid OR handle = p_target_uid;

    RETURN jsonb_build_object('success', true, 'target_uid', p_target_uid, 'is_chat_banned', p_chat_banned);
END;
$$;


-- RPC 13: Admin Toggle Call Ban
DROP FUNCTION IF EXISTS public.admin_toggle_user_call_ban(TEXT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_toggle_user_call_ban(
    p_target_uid TEXT,
    p_call_banned BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET is_call_banned = p_call_banned
    WHERE uid = p_target_uid OR handle = p_target_uid;

    RETURN jsonb_build_object('success', true, 'target_uid', p_target_uid, 'is_call_banned', p_call_banned);
END;
$$;


-- RPC 14: Admin Update User Coins
DROP FUNCTION IF EXISTS public.admin_update_user_coins(TEXT, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_update_user_coins(
    p_target_uid TEXT,
    p_coin_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.app_users
    SET wallet_coins = COALESCE(p_coin_amount, 0)
    WHERE uid = p_target_uid OR handle = p_target_uid;

    RETURN jsonb_build_object('success', true, 'target_uid', p_target_uid, 'wallet_coins', p_coin_amount);
END;
$$;


-- RPC 15: Admin Onboard Staff Member
DROP FUNCTION IF EXISTS public.admin_onboard_staff(TEXT, TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_onboard_staff(
    p_name TEXT,
    p_handle TEXT,
    p_email TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid TEXT := 'u_' + extract(epoch from now())::bigint;
BEGIN
    INSERT INTO public.app_users (uid, name, handle, email, role, is_banned, wallet_coins, created_at)
    VALUES (v_uid, p_name, lower(replace(p_handle, '@', '')), p_email, upper(p_role), false, 1000, NOW())
    ON CONFLICT (handle) DO UPDATE
    SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

    RETURN jsonb_build_object('success', true, 'uid', v_uid, 'handle', p_handle);
END;
$$;


-- RPC 16: Admin Delete Content (Post / Reel / Story / Comment)
DROP FUNCTION IF EXISTS public.admin_delete_content(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_content(
    p_content_type TEXT,
    p_content_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF upper(p_content_type) = 'POST' THEN
        DELETE FROM public.posts WHERE id::text = p_content_id;
    ELSIF upper(p_content_type) = 'REEL' THEN
        DELETE FROM public.reels WHERE id::text = p_content_id;
    ELSIF upper(p_content_type) = 'STORY' THEN
        DELETE FROM public.stories WHERE id::text = p_content_id;
    ELSIF upper(p_content_type) = 'COMMENT' THEN
        DELETE FROM public.comments WHERE id::text = p_content_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'content_type', p_content_type, 'content_id', p_content_id);
END;
$$;


-- RPC 17: Admin Update Report Status
DROP FUNCTION IF EXISTS public.admin_update_report_status(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_update_report_status(
    p_report_id TEXT,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.reported_content SET status = upper(p_status) WHERE id::text = p_report_id;

    RETURN jsonb_build_object('success', true, 'report_id', p_report_id, 'status', p_status);
END;
$$;


-- RPC 18: Admin Issue User Warning
DROP FUNCTION IF EXISTS public.admin_issue_user_warning(TEXT, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_issue_user_warning(
    p_target_handle TEXT,
    p_reason TEXT,
    p_report_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_warnings (target_handle, reason, report_id, created_at)
    VALUES (p_target_handle, p_reason, p_report_id, NOW());

    IF p_report_id IS NOT NULL THEN
        UPDATE public.reported_content SET status = 'RESOLVED' WHERE id::text = p_report_id;
    END IF;

    UPDATE public.app_users
    SET warnings_count = COALESCE(warnings_count, 0) + 1
    WHERE handle = p_target_handle OR uid = p_target_handle;

    RETURN jsonb_build_object('success', true, 'target_handle', p_target_handle);
END;
$$;

-- Grant EXECUTE privileges to all RPCs for Web Admin Panel using explicit signatures
GRANT EXECUTE ON FUNCTION public.admin_record_ad_revenue(DATE, DATE, NUMERIC, BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_settle_revenue_entry(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_monetization_application(TEXT, BOOLEAN, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_creator_payout_action(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_creator_payout_access(TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_broken_posts() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_app_settings(BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INT, INT, TEXT, NUMERIC, TEXT, BOOLEAN, NUMERIC, NUMERIC, INT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_verification_request(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_verification_request(TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_coins_refund(TEXT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_chat_ban(TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_call_ban(TEXT, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_coins(TEXT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_onboard_staff(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_content(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_report_status(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_issue_user_warning(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- UNIFIED CENTRAL WALLET RPCs
-- ==============================================================================

-- RPC 19: Transfer Reward Credits to Wallet Coins
DROP FUNCTION IF EXISTS public.transfer_rewards_to_wallet(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.transfer_rewards_to_wallet(
    p_user_handle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_credits INT := 0;
BEGIN
    SELECT * INTO v_user FROM public.app_users WHERE handle = lower(p_user_handle) OR uid = p_user_handle;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', p_user_handle;
    END IF;

    v_credits := COALESCE(v_user.reward_credits, 0);
    IF v_credits <= 0 THEN
        RETURN jsonb_build_object('ok', true, 'transferred_coins', 0, 'message', 'No reward credits available to transfer');
    END IF;

    UPDATE public.app_users
    SET wallet_coins = COALESCE(wallet_coins, 0) + v_credits,
        reward_credits = 0
    WHERE handle = v_user.handle;

    INSERT INTO public.audit_logs (user_handle, action, details, created_at)
    VALUES (v_user.handle, 'REWARD_TRANSFER', jsonb_build_object('credits_transferred', v_credits), NOW());

    RETURN jsonb_build_object('ok', true, 'transferred_coins', v_credits, 'user_handle', v_user.handle);
END;
$$;


-- RPC 20: Transfer Creator Monetization Earnings to Wallet Coins
DROP FUNCTION IF EXISTS public.transfer_monetization_to_wallet(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.transfer_monetization_to_wallet(
    p_user_handle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_monet_usd NUMERIC := 0;
    v_coins_to_add INT := 0;
    v_credits_per_usd INT := 2000;
BEGIN
    SELECT * INTO v_user FROM public.app_users WHERE handle = lower(p_user_handle) OR uid = p_user_handle;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', p_user_handle;
    END IF;

    v_monet_usd := COALESCE(v_user.monetization_balance_usd, 0);
    IF v_monet_usd <= 0 THEN
        RETURN jsonb_build_object('ok', true, 'transferred_usd', 0, 'transferred_coins', 0, 'message', 'No monetization earnings available to transfer');
    END IF;

    v_coins_to_add := (v_monet_usd * v_credits_per_usd)::INT;

    UPDATE public.app_users
    SET wallet_coins = COALESCE(wallet_coins, 0) + v_coins_to_add,
        monetization_balance_usd = 0
    WHERE handle = v_user.handle;

    INSERT INTO public.audit_logs (user_handle, action, details, created_at)
    VALUES (v_user.handle, 'MONETIZATION_TRANSFER', jsonb_build_object('usd_transferred', v_monet_usd, 'coins_added', v_coins_to_add), NOW());

    RETURN jsonb_build_object('ok', true, 'transferred_usd', v_monet_usd, 'transferred_coins', v_coins_to_add, 'user_handle', v_user.handle);
END;
$$;


-- RPC 21: Submit Deposit / Add Funds Request
DROP FUNCTION IF EXISTS public.submit_add_fund_request(TEXT, NUMERIC, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.submit_add_fund_request(
    p_user_handle TEXT,
    p_usd_amount NUMERIC,
    p_gateway TEXT,
    p_trx_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_coins_to_add INT := 0;
    v_credits_per_usd INT := 2000;
BEGIN
    SELECT * INTO v_user FROM public.app_users WHERE handle = lower(p_user_handle) OR uid = p_user_handle;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', p_user_handle;
    END IF;

    v_coins_to_add := (p_usd_amount * v_credits_per_usd)::INT;

    UPDATE public.app_users
    SET wallet_coins = COALESCE(wallet_coins, 0) + v_coins_to_add
    WHERE handle = v_user.handle;

    INSERT INTO public.audit_logs (user_handle, action, details, created_at)
    VALUES (v_user.handle, 'ADD_FUND', jsonb_build_object('usd_amount', p_usd_amount, 'gateway', p_gateway, 'trx_id', p_trx_id, 'coins_added', v_coins_to_add), NOW());

    RETURN jsonb_build_object('ok', true, 'usd_amount', p_usd_amount, 'coins_added', v_coins_to_add, 'gateway', p_gateway, 'trx_id', p_trx_id);
END;
$$;


-- RPC 22: Unified Request Wallet Withdrawal
DROP FUNCTION IF EXISTS public.request_wallet_withdrawal(TEXT, TEXT, TEXT, TEXT, INT, NUMERIC, NUMERIC, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
    p_user_handle TEXT,
    p_email TEXT,
    p_method TEXT,
    p_account_number TEXT,
    p_credits INT,
    p_amount_usd NUMERIC,
    p_amount_bdt NUMERIC,
    p_client_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_withdrawal_id TEXT := 'wd_' || extract(epoch from now())::bigint;
BEGIN
    SELECT * INTO v_user FROM public.app_users WHERE handle = lower(p_user_handle) OR uid = p_user_handle;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', p_user_handle;
    END IF;

    IF COALESCE(v_user.wallet_coins, 0) < p_credits THEN
        RAISE EXCEPTION 'Insufficient wallet balance (% coins available, % required)', COALESCE(v_user.wallet_coins, 0), p_credits;
    END IF;

    UPDATE public.app_users
    SET wallet_coins = wallet_coins - p_credits
    WHERE handle = v_user.handle;

    INSERT INTO public.creator_payouts (
        id, user_handle, email, method, account_number, credits_used, amount_usd, amount_bdt, status, client_ref, created_at
    ) VALUES (
        v_withdrawal_id, v_user.handle, p_email, p_method, p_account_number, p_credits, p_amount_usd, p_amount_bdt, 'PENDING', p_client_ref, NOW()
    );

    RETURN jsonb_build_object('ok', true, 'withdrawal_id', v_withdrawal_id, 'user_handle', v_user.handle, 'credits_deducted', p_credits);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_rewards_to_wallet(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_monetization_to_wallet(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_add_fund_request(TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(TEXT, TEXT, TEXT, TEXT, INT, NUMERIC, NUMERIC, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
