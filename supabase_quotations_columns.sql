-- QMS quotations schema refactor.
-- Extracts metadata previously embedded inside the `quotes` JSON text column
-- (poValueCurrency, createdBy, createdAt, approvedBy, approvedAt,
-- excludedFromPO) into real columns so partial updates no longer need to
-- rewrite the whole blob and don't risk clobbering audit metadata.
--
-- Run this in the Supabase SQL editor. It is idempotent and safe to re-run.

-- 1) Add the new columns
alter table public.quotations
  add column if not exists po_value_currency text,
  add column if not exists created_by text,
  add column if not exists created_at text,
  add column if not exists approved_by text,
  add column if not exists approved_at text,
  add column if not exists excluded_from_po boolean not null default false;

-- 2) Backfill from the legacy quotes JSON blob for existing rows
update public.quotations
set
  po_value_currency = coalesce(quotation_blob.po_currency, 'AED'),
  created_by       = quotation_blob.created_by,
  created_at       = quotation_blob.created_at,
  approved_by      = quotation_blob.approved_by,
  approved_at      = quotation_blob.approved_at,
  excluded_from_po = coalesce(quotation_blob.excluded, false)
from (
  select
    id,
    quotes -> 'poValueCurrency' as po_currency,
    quotes -> 'createdBy'       as created_by,
    quotes -> 'createdAt'       as created_at,
    quotes -> 'approvedBy'      as approved_by,
    quotes -> 'approvedAt'      as approved_at,
    quotes -> 'excludedFromPO'  as excluded
  from public.quotations
  where quotes is not null
) as quotation_blob
where public.quotations.id = quotation_blob.id
  and public.quotations.po_value_currency is null;

-- 3) Optional: tighten the blob to only its items going forward.
--    New writes from the app already store a minimal { items } payload.
--    Leave legacy rows untouched so they remain readable by older app builds.