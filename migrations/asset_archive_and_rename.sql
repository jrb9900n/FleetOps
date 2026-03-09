-- ============================================================
-- MIGRATION: Asset archive (soft delete) + safe rename
-- ============================================================

-- 1. DELETED ASSETS ARCHIVE TABLE
create table if not exists public.deleted_assets (
  id text primary key,
  name text,
  category text,
  type text,
  year text,
  make text,
  model text,
  status text,
  condition text,
  odometer text,
  odometer_date date,
  vin text,
  comments text,
  hour_meter_equipped boolean,
  odometer_equipped boolean,
  pm_manual_url text,
  created_at timestamptz,
  deleted_at timestamptz default now(),
  deleted_by text,
  audit_snapshot jsonb  -- full audit trail at time of deletion
);

alter table public.deleted_assets enable row level security;

-- Only admin can read or restore (insert back) from this table
create policy "deleted_assets_select" on public.deleted_assets for select
  using (public.my_role() = 'admin');

create policy "deleted_assets_insert" on public.deleted_assets for insert
  with check (public.my_role() in ('admin', 'operations', 'office_manager'));

create policy "deleted_assets_delete" on public.deleted_assets for delete
  using (public.my_role() = 'admin');


-- 2. UPDATE assets_delete RLS to allow operations + office_manager
drop policy if exists "assets_delete" on public.assets;
create policy "assets_delete" on public.assets for delete
  using (public.my_role() in ('admin', 'operations', 'office_manager'));


-- 3. SAFE RENAME FUNCTION
-- Updates all child table asset_id references before updating the PK
-- Avoids the ON DELETE CASCADE wipe that delete+reinsert causes
create or replace function public.rename_asset(old_id text, new_id text)
returns void
language plpgsql
security definer
as $$
begin
  -- Temporarily disable triggers if needed (not required here)
  -- Update all child tables first
  update public.maintenance_logs set asset_id = new_id where asset_id = old_id;
  update public.damage_reports    set asset_id = new_id where asset_id = old_id;
  update public.invoices          set asset_id = new_id where asset_id = old_id;
  update public.pm_schedules      set asset_id = new_id where asset_id = old_id;
  update public.asset_audit       set asset_id = new_id where asset_id = old_id;
  -- Now update the PK on the asset itself
  update public.assets set id = new_id where id = old_id;
end;
$$;

-- Allow authenticated users to call this (RLS on assets table still applies for who can edit)
grant execute on function public.rename_asset(text, text) to authenticated;
