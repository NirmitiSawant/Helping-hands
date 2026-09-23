-- ============================================================================
-- MIGRATION: Fix RLS Infinite Recursion on public.donations and public.profiles
-- ============================================================================

-- 1. Create safe SECURITY DEFINER helper to check if a user has the 'ngo' role
-- Queries public.profiles directly under SECURITY DEFINER without touching public.ngos
CREATE OR REPLACE FUNCTION public.is_ngo_user(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = check_user_id
          AND role = 'ngo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated and anon client roles
GRANT EXECUTE ON FUNCTION public.is_ngo_user(UUID) TO authenticated, anon;

-- 2. Update can_view_donor_profile to prevent mutual recursion
CREATE OR REPLACE FUNCTION public.can_view_donor_profile(donor_user_id UUID, caller_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF caller_user_id IS NULL OR donor_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    -- Donors can always view their own profile directly
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

-- 3. Replace the donations SELECT policy with the non-recursive policy
DROP POLICY IF EXISTS "Donations visibility rule" ON public.donations;
DROP POLICY IF EXISTS "Donation read access rule" ON public.donations;
DROP POLICY IF EXISTS "Users and NGOs can view relevant donations" ON public.donations;
DROP POLICY IF EXISTS "Allow read access to donations" ON public.donations;

CREATE POLICY "Donation read access rule"
ON public.donations
FOR SELECT
USING (
    -- Donor can view own donations
    donor_id = auth.uid()
    OR
    -- Verified NGOs can view all PENDING donations or donations they have accepted
    (
        public.is_ngo_user(auth.uid())
        AND (status = 'PENDING' OR accepted_ngo_id = auth.uid())
    )
    OR
    -- Platform Admin can view all donations
    public.is_platform_admin(auth.uid())
);
