-- QMS app-level users, roles, and module access.
-- Run this in the Supabase SQL editor after updating the admin email if needed.

create table if not exists public.app_users (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('Admin', 'Logistics', 'Sales')),
  modules text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_email_lower_idx on public.app_users (lower(email));

create or replace function public.set_app_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row
execute function public.set_app_users_updated_at();

insert into public.app_users (name, email, role, modules, active)
values (
  'Admin',
  'admin@netceedmea.com',
  'Admin',
  array['dashboard', 'quotations', 'forwarders', 'users'],
  true
)
on conflict (email) do nothing;

create or replace function public.is_qms_app_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@netceedmea.com'
    or exists (
      select 1
      from public.app_users u
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and u.active = true
        and u.role = 'Admin'
        and 'users' = any(u.modules)
    );
$$;

alter table public.app_users enable row level security;

drop policy if exists "QMS app users can read own profile" on public.app_users;
create policy "QMS app users can read own profile"
on public.app_users
for select
to authenticated
using (
  public.is_qms_app_admin()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "QMS admins can create app users" on public.app_users;
create policy "QMS admins can create app users"
on public.app_users
for insert
to authenticated
with check (public.is_qms_app_admin());

drop policy if exists "QMS admins can update app users" on public.app_users;
create policy "QMS admins can update app users"
on public.app_users
for update
to authenticated
using (public.is_qms_app_admin())
with check (public.is_qms_app_admin());

drop policy if exists "QMS admins can delete app users" on public.app_users;
create policy "QMS admins can delete app users"
on public.app_users
for delete
to authenticated
using (public.is_qms_app_admin());
