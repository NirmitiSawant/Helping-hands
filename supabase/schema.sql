-- ============================================================================
-- HELPING HANDS - PRODUCTION SUPABASE DATABASE SCHEMA (HARDENED & VERIFIED)
-- Community Donation Platform with Strict RBAC, Immutable Roles & Atomic Concurrency
-- ============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (DONOR, NGO, ADMIN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('donor', 'ngo', 'admin')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 2. PLATFORM ADMIN TABLE (STRICTLY ONE AUTHORIZED ADMIN ENFORCED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Database trigger to guarantee that platform_admin can NEVER hold more than 1 record
CREATE OR REPLACE FUNCTION check_single_platform_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM public.platform_admin WHERE user_id != NEW.user_id;
    IF admin_count >= 1 AND (TG_OP = 'INSERT') THEN
        RAISE EXCEPTION 'Helping Hands security constraint: exactly one authorized platform administrator is permitted.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_platform_admin ON public.platform_admin;
CREATE TRIGGER trg_single_platform_admin
BEFORE INSERT ON public.platform_admin
FOR EACH ROW EXECUTE FUNCTION check_single_platform_admin();

-- Authoritative helper function: Verifies if current authenticated caller is the single platform admin
-- Implemented as SECURITY DEFINER without joining profiles to guarantee zero RLS recursion
CREATE OR REPLACE FUNCTION public.is_platform_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 
        FROM public.platform_admin pa
        WHERE pa.user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Authoritative role helper: Retrieves user role with SECURITY DEFINER to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF check_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = check_user_id;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Authoritative NGO membership check: Verifies NGO registration with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_ngo(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.ngos WHERE id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Safe NGO role check using profiles without querying public.ngos or triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_ngo_user(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE id = check_user_id AND role = 'ngo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_ngo_user(UUID) TO authenticated, anon;

-- Authoritative Donor membership check: Verifies donor profile with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_donor(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE id = check_user_id AND role = 'donor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Secure Profile Visibility Check: Allows verified NGOs to view donor contact details
-- for PENDING or accepted donations without triggering mutual RLS evaluation
CREATE OR REPLACE FUNCTION public.can_view_donor_profile(donor_user_id UUID, caller_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF caller_user_id IS NULL OR donor_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    IF caller_user_id = donor_user_id THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 
        FROM public.donations d
        WHERE d.donor_id = donor_user_id 
          AND (
            d.accepted_ngo_id = caller_user_id 
            OR (d.status = 'PENDING' AND public.is_ngo_user(caller_user_id))
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Secure Feedback Submission Check: Verifies eligibility with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.can_submit_feedback(p_donation_id UUID, p_donor_id UUID, p_ngo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.donations 
        WHERE id = p_donation_id 
          AND donor_id = p_donor_id 
          AND status = 'COMPLETED'
          AND accepted_ngo_id = p_ngo_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Strict Profile Role Immutability & Anti-Tampering Trigger
-- Prevents:
--   donor -> admin
--   ngo -> admin
--   donor -> ngo
--   ngo -> donor
CREATE OR REPLACE FUNCTION public.check_profile_role_security()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT: prevent standard registration from setting role = 'admin'
    IF TG_OP = 'INSERT' THEN
        IF NEW.role = 'admin' THEN
            IF auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.platform_admin WHERE user_id = NEW.id) THEN
                RAISE EXCEPTION 'Unauthorized: Users cannot register or assign themselves the administrator role.';
            END IF;
        END IF;
    END IF;

    -- On UPDATE: Profile roles are strictly IMMUTABLE for all normal users
    IF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF NOT public.is_platform_admin(auth.uid()) AND NOT EXISTS (SELECT 1 FROM public.platform_admin WHERE user_id = NEW.id) THEN
                RAISE EXCEPTION 'Helping Hands security constraint: Profile roles are immutable. Users cannot switch between donor, ngo, or admin.';
            END IF;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_profile_role_security ON public.profiles;
CREATE TRIGGER trg_check_profile_role_security
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_security();

-- ============================================================================
-- 3. SECURE SINGLE ADMIN AUTHORIZATION FUNCTIONS (LOCKED DOWN)
-- ============================================================================
-- Dedicated secure backend functions for initial bootstrap and single admin setup.
-- EXECUTE permission is explicitly revoked from anon and authenticated client roles.
CREATE OR REPLACE FUNCTION public.authorize_single_platform_admin(
    p_user_id UUID,
    p_name TEXT DEFAULT 'Platform Administrator'
)
RETURNS JSONB AS $$
DECLARE
    v_user_email TEXT;
    v_existing_admin_count INT;
    v_result JSONB;
BEGIN
    -- 1. Confirm target user exists in auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Target user ID % does not exist in auth.users. Please create or sign up the user in Supabase Auth first.', p_user_id;
    END IF;

    -- 2. Enforce strictly ONE admin: if another user is already authorized, reject
    SELECT COUNT(*) INTO v_existing_admin_count 
    FROM public.platform_admin 
    WHERE user_id != p_user_id;

    IF v_existing_admin_count > 0 THEN
        RAISE EXCEPTION 'Helping Hands policy violation: A platform administrator already exists. Exactly one administrator is allowed.';
    END IF;

    -- 3. Authorize in platform_admin table
    INSERT INTO public.platform_admin (user_id, assigned_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Safely set or update profile role to 'admin'
    INSERT INTO public.profiles (id, role, name, email, updated_at)
    VALUES (p_user_id, 'admin', p_name, v_user_email, NOW())
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin',
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = NOW();

    SELECT jsonb_build_object(
        'status', 'success',
        'message', 'Platform administrator successfully authorized.',
        'user_id', p_user_id,
        'email', v_user_email,
        'role', 'admin'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Convenience wrapper to authorize by the user's Supabase Auth email
CREATE OR REPLACE FUNCTION public.authorize_single_platform_admin_by_email(
    p_email TEXT,
    p_name TEXT DEFAULT 'Platform Administrator'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email "%" was not found in auth.users. Please create the user in Supabase Auth first.', p_email;
    END IF;
    RETURN public.authorize_single_platform_admin(v_user_id, p_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CRITICAL HARDENING: Revoke execute privileges on admin authorization functions from all client roles
REVOKE EXECUTE ON FUNCTION public.authorize_single_platform_admin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.authorize_single_platform_admin_by_email(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_single_platform_admin(UUID, TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.authorize_single_platform_admin_by_email(TEXT, TEXT) TO postgres, service_role;

-- ============================================================================
-- 4. NGOS TABLE (VERIFIED CHARITY PROFILE & CREDENTIALS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ngos (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_name TEXT NOT NULL,
    darpan_id TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ngos_city ON public.ngos(city);
CREATE INDEX IF NOT EXISTS idx_ngos_category ON public.ngos(category);

-- ============================================================================
-- 5. DONATIONS TABLE (AUTHORITATIVE DONATION RECORD & PIPELINE)
-- ============================================================================
-- Status flow: PENDING -> ACCEPTED -> SCHEDULED -> COMPLETED (or CANCELLED)
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    condition TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    city TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
    accepted_ngo_id UUID REFERENCES public.ngos(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_accepted_ngo ON public.donations(accepted_ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_city ON public.donations(city);
CREATE INDEX IF NOT EXISTS idx_donations_category ON public.donations(category);

-- Trigger: Enforce exact lifecycle state transitions and immutable pickup logistics
-- Lifecycle: PENDING -> ACCEPTED -> SCHEDULED -> COMPLETED
-- (CANCELLED is a terminal cancellation state)
CREATE OR REPLACE FUNCTION public.enforce_donation_lifecycle_and_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- 1. donor_id is permanently immutable
        IF NEW.donor_id IS DISTINCT FROM OLD.donor_id THEN
            RAISE EXCEPTION 'Helping Hands security constraint: donor_id cannot be modified.';
        END IF;

        -- 2. pickup_date and pickup_time are strictly immutable once accepted
        IF (NEW.pickup_date IS DISTINCT FROM OLD.pickup_date) OR (NEW.pickup_time IS DISTINCT FROM OLD.pickup_time) THEN
            IF OLD.status != 'PENDING' AND NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Helping Hands policy violation: Donor-selected pickup date and time are final and cannot be modified after acceptance.';
            END IF;
            -- While PENDING, only the creating donor or Admin can modify pickup schedule
            IF auth.uid() IS NOT NULL AND auth.uid() != OLD.donor_id AND NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Unauthorized: Only the creating donor can modify pickup schedule.';
            END IF;
        END IF;

        -- 3. Strict lifecycle state transition validation
        -- PENDING -> ACCEPTED -> SCHEDULED -> COMPLETED
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT public.is_platform_admin(auth.uid()) THEN
                IF OLD.status = 'PENDING' AND NEW.status NOT IN ('ACCEPTED', 'CANCELLED') THEN
                    RAISE EXCEPTION 'Invalid status transition: PENDING donations can only transition to ACCEPTED or CANCELLED.';
                ELSIF OLD.status = 'ACCEPTED' AND NEW.status NOT IN ('SCHEDULED', 'CANCELLED') THEN
                    -- Direct ACCEPTED -> COMPLETED is strictly prohibited
                    RAISE EXCEPTION 'Invalid status transition: ACCEPTED donations must be marked SCHEDULED before they can be COMPLETED.';
                ELSIF OLD.status = 'SCHEDULED' AND NEW.status NOT IN ('COMPLETED', 'CANCELLED') THEN
                    RAISE EXCEPTION 'Invalid status transition: SCHEDULED donations can only transition to COMPLETED or CANCELLED.';
                ELSIF OLD.status = 'COMPLETED' THEN
                    RAISE EXCEPTION 'Invalid status transition: COMPLETED donations are final and cannot change status.';
                ELSIF OLD.status = 'CANCELLED' THEN
                    RAISE EXCEPTION 'Invalid status transition: CANCELLED donations cannot be reopened or change status.';
                END IF;

                -- If status is changing to ACCEPTED, accepted_ngo_id must be assigned to the accepting NGO
                IF NEW.status = 'ACCEPTED' AND (NEW.accepted_ngo_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid() != NEW.accepted_ngo_id)) THEN
                    RAISE EXCEPTION 'Unauthorized: NGO ID must match the authenticated charity accepting the donation.';
                END IF;
            END IF;
        END IF;

        -- 4. accepted_ngo_id is immutable once assigned
        IF OLD.accepted_ngo_id IS NOT NULL AND NEW.accepted_ngo_id IS DISTINCT FROM OLD.accepted_ngo_id THEN
            IF NOT public.is_platform_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Helping Hands policy violation: An accepted donation cannot be reassigned to another organization.';
            END IF;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_donation_lifecycle ON public.donations;
CREATE TRIGGER trg_enforce_donation_lifecycle
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.enforce_donation_lifecycle_and_immutability();

-- ============================================================================
-- 6. NOTIFICATIONS TABLE (SYSTEM-WIDE PARTICIPANT NOTIFICATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- 7. FEEDBACKS TABLE (POST-COMPLETION RATINGS & REVIEWS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL UNIQUE REFERENCES public.donations(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_ngo ON public.feedbacks(ngo_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_donor ON public.feedbacks(donor_id);

-- Enforce that feedback can ONLY be submitted when donation status is COMPLETED
-- and the feedback NGO matches the actual accepted_ngo_id of the donation
CREATE OR REPLACE FUNCTION public.verify_feedback_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
    v_donor_id UUID;
    v_accepted_ngo_id UUID;
BEGIN
    SELECT status, donor_id, accepted_ngo_id INTO v_status, v_donor_id, v_accepted_ngo_id 
    FROM public.donations 
    WHERE id = NEW.donation_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Donation record does not exist.';
    END IF;
    IF v_status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Feedback can only be submitted after the donation status is COMPLETED. Current status: %', v_status;
    END IF;
    IF v_donor_id != NEW.donor_id THEN
        RAISE EXCEPTION 'Only the donor of this donation is authorized to submit feedback.';
    END IF;
    IF v_accepted_ngo_id IS NULL OR NEW.ngo_id != v_accepted_ngo_id THEN
        RAISE EXCEPTION 'Invalid NGO: Feedback can only be submitted for the NGO that accepted this donation.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_verify_feedback_eligibility ON public.feedbacks;
CREATE TRIGGER trg_verify_feedback_eligibility
BEFORE INSERT ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.verify_feedback_eligibility();

-- ============================================================================
-- 8. ACTIVITY LOGS TABLE (AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_id UUID,
    entity_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ============================================================================
-- 9. AUTOMATIC ACTIVITY LOGGING & NOTIFICATION TRIGGERS
-- ============================================================================

-- Trigger: Log Donation Creation
CREATE OR REPLACE FUNCTION public.on_donation_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type, metadata)
    VALUES (
        'DONATION_CREATED',
        format('New donation listing created: "%s" (%s)', NEW.title, NEW.category),
        NEW.donor_id,
        NEW.id,
        'donations',
        jsonb_build_object(
            'category', NEW.category,
            'quantity', NEW.quantity,
            'city', NEW.city,
            'pickup_date', NEW.pickup_date,
            'pickup_time', NEW.pickup_time
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_donation_created ON public.donations;
CREATE TRIGGER trg_on_donation_created
AFTER INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.on_donation_created();

-- Trigger: Log Feedback Submission & Notify NGO
CREATE OR REPLACE FUNCTION public.on_feedback_created()
RETURNS TRIGGER AS $$
DECLARE
    v_donation public.donations%ROWTYPE;
BEGIN
    SELECT * INTO v_donation FROM public.donations WHERE id = NEW.donation_id;
    
    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type, metadata)
    VALUES (
        'FEEDBACK_SUBMITTED',
        format('Donor submitted %s-star review for donation "%s"', NEW.rating, COALESCE(v_donation.title, 'donation')),
        NEW.donor_id,
        NEW.id,
        'feedbacks',
        jsonb_build_object(
            'rating', NEW.rating,
            'donation_id', NEW.donation_id,
            'ngo_id', NEW.ngo_id
        )
    );

    -- Automatically notify the NGO of feedback received
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.ngo_id,
        'New Donor Feedback Received',
        format('You received a %s-star rating from the donor for donation "%s".', NEW.rating, COALESCE(v_donation.title, 'donation')),
        'FEEDBACK_RECEIVED'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_feedback_created ON public.feedbacks;
CREATE TRIGGER trg_on_feedback_created
AFTER INSERT ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.on_feedback_created();

-- ============================================================================
-- 10. ATOMIC BUSINESS LOGIC FUNCTIONS (ROW-LEVEL LOCKING & PREVENTING RACES)
-- ============================================================================

-- Function: Atomic Acceptance of Donation by NGO
-- Guarantees:
-- 1. Explicitly verifies that the caller has role = 'ngo' in profiles (or is platform admin)
-- 2. Row locked with SELECT ... FOR UPDATE (prevents concurrent claims by multiple NGOs)
-- 3. Verifies status = 'PENDING'
-- 4. Sets accepted_ngo_id as authoritative relationship
-- 5. Preserves final donor pickup schedule
-- 6. Generates real-time notifications for Donor and NGO
-- 7. Generates activity log entry
CREATE OR REPLACE FUNCTION public.accept_donation(
    p_donation_id UUID,
    p_ngo_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_donation public.donations%ROWTYPE;
    v_ngo public.ngos%ROWTYPE;
    v_donor public.profiles%ROWTYPE;
    v_caller_role TEXT;
BEGIN
    -- 1. Explicitly verify that caller has profiles.role = 'ngo' (or is platform admin)
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ngo' AND NOT public.is_platform_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only verified NGOs can accept donations. Current user profile role: %', COALESCE(v_caller_role, 'none');
    END IF;

    -- 2. Verify NGO caller identity matches target organization parameter
    IF auth.uid() != p_ngo_id AND NOT public.is_platform_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Caller must match the accepting NGO.';
    END IF;

    -- 3. Verify NGO organization record exists
    SELECT * INTO v_ngo FROM public.ngos WHERE id = p_ngo_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NGO organization record not found.';
    END IF;

    -- 4. Lock the donation row exclusively to prevent race conditions
    SELECT * INTO v_donation 
    FROM public.donations 
    WHERE id = p_donation_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation record not found.';
    END IF;

    -- 5. Authoritative state check: only PENDING donations can be accepted
    IF v_donation.status != 'PENDING' THEN
        RAISE EXCEPTION 'This donation is no longer available (current status: %). Another organization may have already accepted it.', v_donation.status;
    END IF;

    IF v_donation.accepted_ngo_id IS NOT NULL THEN
        RAISE EXCEPTION 'This donation has already been accepted by another charity.';
    END IF;

    -- 6. Update donation status atomically (leaves scheduled_at NULL until mark_donation_scheduled)
    UPDATE public.donations
    SET 
        status = 'ACCEPTED',
        accepted_ngo_id = p_ngo_id,
        updated_at = NOW()
    WHERE id = p_donation_id
    RETURNING * INTO v_donation;

    -- Fetch donor profile for contact details
    SELECT * INTO v_donor FROM public.profiles WHERE id = v_donation.donor_id;

    -- 7. Insert Donor notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_donation.donor_id,
        'Donation Accepted!',
        format('Great news! %s has accepted your donation "%s". Scheduled pickup on %s at %s.', v_ngo.org_name, v_donation.title, v_donation.pickup_date, v_donation.pickup_time),
        'DONATION_ACCEPTED'
    );

    -- 8. Insert NGO notification (containing pickup date/time & donor contact)
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        p_ngo_id,
        'Donation Pickup Scheduled',
        format('You accepted "%s". Please arrive at %s, %s on %s at %s. Donor phone: %s', v_donation.title, v_donation.pickup_location, v_donation.city, v_donation.pickup_date, v_donation.pickup_time, COALESCE(v_donor.phone, 'Not provided')),
        'SCHEDULED_PICKUP'
    );

    -- 9. Record in audit trail
    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type, metadata)
    VALUES (
        'DONATION_ACCEPTED',
        format('NGO "%s" accepted donation "%s"', v_ngo.org_name, v_donation.title),
        p_ngo_id,
        p_donation_id,
        'donations',
        jsonb_build_object(
            'ngo_id', p_ngo_id,
            'ngo_name', v_ngo.org_name,
            'donor_id', v_donation.donor_id,
            'pickup_date', v_donation.pickup_date,
            'pickup_time', v_donation.pickup_time
        )
    );

    RETURN to_jsonb(v_donation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Mark Donation Scheduled (ACCEPTED -> SCHEDULED)
CREATE OR REPLACE FUNCTION public.mark_donation_scheduled(
    p_donation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_donation public.donations%ROWTYPE;
BEGIN
    SELECT * INTO v_donation FROM public.donations WHERE id = p_donation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation not found.';
    END IF;

    IF v_donation.accepted_ngo_id != auth.uid() AND NOT public.is_platform_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only the accepting NGO or Admin can confirm route schedule.';
    END IF;

    IF v_donation.status != 'ACCEPTED' THEN
        RAISE EXCEPTION 'Donation must be in ACCEPTED status to mark SCHEDULED. Current status: %', v_donation.status;
    END IF;

    UPDATE public.donations
    SET status = 'SCHEDULED', scheduled_at = NOW(), updated_at = NOW()
    WHERE id = p_donation_id
    RETURNING * INTO v_donation;

    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type)
    VALUES (
        'DONATION_SCHEDULED',
        format('Pickup route for donation "%s" is confirmed.', v_donation.title),
        auth.uid(),
        p_donation_id,
        'donations'
    );

    RETURN to_jsonb(v_donation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Mark Donation Completed (STRICTLY SCHEDULED -> COMPLETED)
-- Direct transition from ACCEPTED -> COMPLETED is strictly prohibited
CREATE OR REPLACE FUNCTION public.mark_donation_completed(
    p_donation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_donation public.donations%ROWTYPE;
    v_ngo public.ngos%ROWTYPE;
BEGIN
    SELECT * INTO v_donation FROM public.donations WHERE id = p_donation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation not found.';
    END IF;

    IF v_donation.accepted_ngo_id != auth.uid() AND NOT public.is_platform_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only the accepting NGO or Admin can mark completed.';
    END IF;

    -- Strict check: ONLY SCHEDULED donations can be marked COMPLETED
    IF v_donation.status != 'SCHEDULED' THEN
        RAISE EXCEPTION 'Donation must be SCHEDULED before it can be marked COMPLETED. Current status: %', v_donation.status;
    END IF;

    UPDATE public.donations
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_donation_id
    RETURNING * INTO v_donation;

    SELECT * INTO v_ngo FROM public.ngos WHERE id = v_donation.accepted_ngo_id;

    -- Prompt Donor for feedback
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_donation.donor_id,
        'Donation Completed! Share Your Feedback',
        format('Your donation "%s" was successfully picked up by %s! Please rate your experience to help us improve.', v_donation.title, COALESCE(v_ngo.org_name, 'NGO')),
        'DONATION_COMPLETED'
    );

    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type)
    VALUES (
        'DONATION_COMPLETED',
        format('Donation "%s" was marked COMPLETED.', v_donation.title),
        auth.uid(),
        p_donation_id,
        'donations'
    );

    RETURN to_jsonb(v_donation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Cancel Donation
CREATE OR REPLACE FUNCTION public.cancel_donation(
    p_donation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_donation public.donations%ROWTYPE;
BEGIN
    SELECT * INTO v_donation FROM public.donations WHERE id = p_donation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation not found.';
    END IF;

    IF v_donation.donor_id != auth.uid() AND NOT public.is_platform_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only the donor or Admin can cancel this donation.';
    END IF;

    IF v_donation.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Completed donations cannot be cancelled.';
    END IF;

    IF v_donation.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Donation is already cancelled.';
    END IF;

    UPDATE public.donations
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = p_donation_id
    RETURNING * INTO v_donation;

    -- If already accepted by an NGO, notify the NGO immediately
    IF v_donation.accepted_ngo_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_donation.accepted_ngo_id,
            'Donation Cancelled by Donor',
            format('The donor has cancelled donation "%s".', v_donation.title),
            'DONATION_CANCELLED'
        );
    END IF;

    INSERT INTO public.activity_logs (action_type, description, user_id, entity_id, entity_type)
    VALUES (
        'DONATION_CANCELLED',
        format('Donation "%s" was cancelled.', v_donation.title),
        auth.uid(),
        p_donation_id,
        'donations'
    );

    RETURN to_jsonb(v_donation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id 
    OR public.is_platform_admin(auth.uid())
    OR public.can_view_donor_profile(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (
    auth.uid() = id 
    AND role IN ('donor', 'ngo') -- Prevents self-assignment of role = 'admin'
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id 
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    -- Normal users can never change their assigned role
    (auth.uid() = id AND role = public.get_user_role(auth.uid()))
    OR public.is_platform_admin(auth.uid())
);

-- ----------------------------------------------------------------------------
-- PLATFORM_ADMIN RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can read platform_admin" ON public.platform_admin;
CREATE POLICY "Admin can read platform_admin"
ON public.platform_admin FOR SELECT
USING (auth.uid() = user_id OR public.is_platform_admin(auth.uid()));

-- No direct client INSERT/UPDATE on platform_admin allowed; managed exclusively by authorize_single_platform_admin

-- ----------------------------------------------------------------------------
-- NGOS RLS (PRIVACY & ROLE HARDENED)
-- ----------------------------------------------------------------------------
-- Registered non-profit charity directory is viewable by platform participants
DROP POLICY IF EXISTS "NGO profile visibility rule" ON public.ngos;
CREATE POLICY "NGO profile visibility rule"
ON public.ngos FOR SELECT
USING (true);

-- NGO record can ONLY be created when the authenticated user's profiles.role = 'ngo'
DROP POLICY IF EXISTS "NGO can insert own organization details" ON public.ngos;
CREATE POLICY "NGO can insert own organization details"
ON public.ngos FOR INSERT
WITH CHECK (
    auth.uid() = id
    AND public.get_user_role(auth.uid()) = 'ngo'
);

-- NGO record can ONLY be updated by the NGO itself (with role = 'ngo') or the Platform Admin
DROP POLICY IF EXISTS "NGO can update own details" ON public.ngos;
CREATE POLICY "NGO can update own details"
ON public.ngos FOR UPDATE
USING (
    (auth.uid() = id AND public.get_user_role(auth.uid()) = 'ngo')
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    (auth.uid() = id AND public.get_user_role(auth.uid()) = 'ngo')
    OR public.is_platform_admin(auth.uid())
);

-- ----------------------------------------------------------------------------
-- DONATIONS RLS (STRICT CLIENT PRIVILEGES)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Donations visibility rule" ON public.donations;
DROP POLICY IF EXISTS "Donation read access rule" ON public.donations;
DROP POLICY IF EXISTS "Users and NGOs can view relevant donations" ON public.donations;
DROP POLICY IF EXISTS "Allow read access to donations" ON public.donations;

CREATE POLICY "Donation read access rule"
ON public.donations FOR SELECT
USING (
    -- Donor can view own donations
    donor_id = auth.uid()
    -- Verified NGOs can view all PENDING donations or donations they have accepted
    OR (
        public.is_ngo_user(auth.uid())
        AND (status = 'PENDING' OR accepted_ngo_id = auth.uid())
    )
    -- Platform Admin can view all donations
    OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Donors can insert donations" ON public.donations;
CREATE POLICY "Donors can insert donations"
ON public.donations FOR INSERT
WITH CHECK (
    auth.uid() = donor_id
    AND public.is_donor(auth.uid())
    AND status = 'PENDING'
);

-- NGOs CANNOT execute direct UPDATE on donations.
-- All state transitions must occur via secure RPC functions:
-- accept_donation, mark_donation_scheduled, mark_donation_completed, cancel_donation.
-- Donors can only update details while the donation is in PENDING state.
DROP POLICY IF EXISTS "Donors can update own pending donations" ON public.donations;
CREATE POLICY "Donors can update own pending donations"
ON public.donations FOR UPDATE
USING (
    (donor_id = auth.uid() AND status = 'PENDING')
    OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
    (donor_id = auth.uid() AND status = 'PENDING' AND accepted_ngo_id IS NULL)
    OR public.is_platform_admin(auth.uid())
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS RLS (SECURE NOTIFICATION ENGINE)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark own notifications as read"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Normal users CANNOT insert arbitrary notifications. Notifications are generated exclusively
-- by database triggers and SECURITY DEFINER functions (or by Admin).
DROP POLICY IF EXISTS "Only admin can directly insert notifications" ON public.notifications;
CREATE POLICY "Only admin can directly insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- FEEDBACKS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Feedbacks viewable by participants or admin" ON public.feedbacks;
CREATE POLICY "Feedbacks viewable by participants or admin"
ON public.feedbacks FOR SELECT
USING (
    donor_id = auth.uid() 
    OR ngo_id = auth.uid() 
    OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Donors can submit feedback for completed donations" ON public.feedbacks;
CREATE POLICY "Donors can submit feedback for completed donations"
ON public.feedbacks FOR INSERT
WITH CHECK (
    auth.uid() = donor_id
    AND public.can_submit_feedback(donation_id, auth.uid(), ngo_id)
);

-- ----------------------------------------------------------------------------
-- ACTIVITY_LOGS RLS (AUDIT LOG INTEGRITY)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Activity logs viewable by actor or admin" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by actor or admin"
ON public.activity_logs FOR SELECT
USING (
    user_id = auth.uid() 
    OR public.is_platform_admin(auth.uid())
);

-- Normal users CANNOT insert arbitrary activity logs. Logs are written exclusively
-- by trusted database triggers and SECURITY DEFINER functions (or by Admin).
DROP POLICY IF EXISTS "Only admin can directly insert activity logs" ON public.activity_logs;
CREATE POLICY "Only admin can directly insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));
