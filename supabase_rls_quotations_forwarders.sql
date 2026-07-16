-- RLS policies for quotations and forwarders tables.
-- Run this in the Supabase SQL editor AFTER enabling RLS on these tables.
-- These policies enforce server-side authorization independently of client-side checks.

-- ============================================================
-- QUOTATIONS TABLE
-- ============================================================

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user is a QMS admin
-- (reuses the is_qms_app_admin() function from supabase_app_users.sql)

-- All authenticated users can read quotations (read access for dashboard/reporting)
DROP POLICY IF EXISTS "QMS authenticated users can read quotations" ON public.quotations;
CREATE POLICY "QMS authenticated users can read quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (true);

-- Admin and Logistics users can create quotations
DROP POLICY IF EXISTS "QMS admin/logistics can create quotations" ON public.quotations;
CREATE POLICY "QMS admin/logistics can create quotations"
ON public.quotations
FOR insert
TO authenticated
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'quotations' = any(u.modules)
  )
);

-- Admin and Logistics users can update quotations
DROP POLICY IF EXISTS "QMS admin/logistics can update quotations" ON public.quotations;
CREATE POLICY "QMS admin/logistics can update quotations"
ON public.quotations
FOR update
TO authenticated
USING (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'quotations' = any(u.modules)
  )
)
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'quotations' = any(u.modules)
  )
);

-- Only admins can delete quotations
DROP POLICY IF EXISTS "QMS admins can delete quotations" ON public.quotations;
CREATE POLICY "QMS admins can delete quotations"
ON public.quotations
FOR delete
TO authenticated
USING (public.is_qms_app_admin());

-- ============================================================
-- FORWARDERS TABLE
-- ============================================================

ALTER TABLE public.forwarders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read forwarders
DROP POLICY IF EXISTS "QMS authenticated users can read forwarders" ON public.forwarders;
CREATE POLICY "QMS authenticated users can read forwarders"
ON public.forwarders
FOR SELECT
TO authenticated
USING (true);

-- Admin and Logistics users can create forwarders
DROP POLICY IF EXISTS "QMS admin/logistics can create forwarders" ON public.forwarders;
CREATE POLICY "QMS admin/logistics can create forwarders"
ON public.forwarders
FOR insert
TO authenticated
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
);

-- Admin and Logistics users can update forwarders
DROP POLICY IF EXISTS "QMS admin/logistics can update forwarders" ON public.forwarders;
CREATE POLICY "QMS admin/logistics can update forwarders"
ON public.forwarders
FOR update
TO authenticated
USING (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
)
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
);

-- Only admins can delete forwarders
DROP POLICY IF EXISTS "QMS admins can delete forwarders" ON public.forwarders;
CREATE POLICY "QMS admins can delete forwarders"
ON public.forwarders
FOR delete
TO authenticated
USING (public.is_qms_app_admin());
