-- ============================================================
-- QMS FULL MIGRATION — Run this single file in Supabase SQL Editor
-- ============================================================

-- 1) Add missing columns to quotations table
alter table public.quotations
  add column if not exists po_value_currency text,
  add column if not exists created_by text,
  add column if not exists created_at text,
  add column if not exists approved_by text,
  add column if not exists approved_at text,
  add column if not exists excluded_from_po boolean not null default false;

-- 2) Backfill existing rows from the quotes JSON blob (safe: skips non-JSON rows)
update public.quotations
set
  po_value_currency = coalesce(quotes::jsonb ->> 'poValueCurrency', 'AED'),
  created_by        = quotes::jsonb ->> 'createdBy',
  created_at        = nullif(quotes::jsonb ->> 'createdAt', '')::timestamptz,
  approved_by       = quotes::jsonb ->> 'approvedBy',
  approved_at       = nullif(quotes::jsonb ->> 'approvedAt', '')::timestamptz,
  excluded_from_po  = coalesce((quotes::jsonb ->> 'excludedFromPO')::boolean, false)
where quotes is not null
  and quotes::text ~ '^\s*\{'
  and po_value_currency is null;

-- 3) Enable RLS and create policies for quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QMS authenticated users can read quotations" ON public.quotations;
CREATE POLICY "QMS authenticated users can read quotations"
ON public.quotations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "QMS admin/logistics/sales can create quotations" ON public.quotations;
CREATE POLICY "QMS admin/logistics/sales can create quotations"
ON public.quotations FOR insert TO authenticated
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics' OR u.role = 'Sales')
      AND 'quotations' = any(u.modules)
  )
);

DROP POLICY IF EXISTS "QMS admin/logistics/sales can update quotations" ON public.quotations;
CREATE POLICY "QMS admin/logistics/sales can update quotations"
ON public.quotations FOR update TO authenticated
USING (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics' OR u.role = 'Sales')
      AND 'quotations' = any(u.modules)
  )
)
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics' OR u.role = 'Sales')
      AND 'quotations' = any(u.modules)
  )
);

DROP POLICY IF EXISTS "QMS admins can delete quotations" ON public.quotations;
CREATE POLICY "QMS admins can delete quotations"
ON public.quotations FOR delete TO authenticated
USING (public.is_qms_app_admin());

-- 4) Enable RLS and create policies for forwarders
ALTER TABLE public.forwarders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QMS authenticated users can read forwarders" ON public.forwarders;
CREATE POLICY "QMS authenticated users can read forwarders"
ON public.forwarders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "QMS admin/logistics can create forwarders" ON public.forwarders;
CREATE POLICY "QMS admin/logistics can create forwarders"
ON public.forwarders FOR insert TO authenticated
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
);

DROP POLICY IF EXISTS "QMS admin/logistics can update forwarders" ON public.forwarders;
CREATE POLICY "QMS admin/logistics can update forwarders"
ON public.forwarders FOR update TO authenticated
USING (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
)
WITH CHECK (
  public.is_qms_app_admin()
  OR EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.active = true
      AND (u.role = 'Admin' OR u.role = 'Logistics')
      AND 'forwarders' = any(u.modules)
  )
);

DROP POLICY IF EXISTS "QMS admins can delete forwarders" ON public.forwarders;
CREATE POLICY "QMS admins can delete forwarders"
ON public.forwarders FOR delete TO authenticated
USING (public.is_qms_app_admin());
