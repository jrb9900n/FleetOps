-- ============================================================
-- FleetOps Maintenance System — Supabase Schema
-- Run this entire script in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. USER PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'field_crew'
    check (role in ('admin','office_manager','foreman','field_crew')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 
          coalesce(new.raw_user_meta_data->>'role', 'field_crew'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ASSETS
create table public.assets (
  id text primary key,  -- e.g. LAN-001
  name text not null,
  category text not null,
  type text not null,
  year text,
  make text,
  model text,
  status text default 'active'
    check (status in ('active','out of service','maintenance','retired')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- 3. MAINTENANCE LOGS
create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete cascade,
  date date not null,
  title text not null,
  type text not null
    check (type in ('preventive','corrective','inspection','damage_repair','other')),
  description text,
  performed_by text,
  vendor text,
  internal_hours numeric(6,2) default 0,
  external_cost numeric(10,2) default 0,
  odometer text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);


-- 4. DAMAGE REPORTS
create table public.damage_reports (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete cascade,
  date date not null,
  reported_by text,
  severity text not null
    check (severity in ('minor','moderate','major','critical')),
  description text not null,
  location text,
  action_taken text,
  status text default 'open'
    check (status in ('open','in_progress','resolved')),
  resolved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);


-- 5. INVOICES
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete cascade,
  date date not null,
  vendor text,
  amount numeric(10,2) not null,
  invoice_number text,
  description text,
  file_name text,
  file_url text,  -- for future Supabase Storage integration
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);


-- 6. PM SCHEDULES
create table public.pm_schedules (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete cascade,
  task text not null,
  interval text not null,
  last_performed date,
  next_due date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down — users only see what they should
-- ============================================================

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.damage_reports enable row level security;
alter table public.invoices enable row level security;
alter table public.pm_schedules enable row level security;

-- Helper: get current user's role
create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- PROFILES: users see their own; admins see all
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.my_role() = 'admin');

create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());

-- ASSETS: all authenticated users can read; only admin can write
create policy "assets_select" on public.assets for select
  using (auth.role() = 'authenticated');

create policy "assets_insert" on public.assets for insert
  with check (public.my_role() = 'admin');

create policy "assets_update" on public.assets for update
  using (public.my_role() = 'admin');

create policy "assets_delete" on public.assets for delete
  using (public.my_role() = 'admin');

-- MAINTENANCE LOGS: field_crew, foreman, admin can insert; office_manager/admin/foreman can read all
create policy "logs_select" on public.maintenance_logs for select
  using (public.my_role() in ('admin','office_manager','foreman')
         or created_by = auth.uid());

create policy "logs_insert" on public.maintenance_logs for insert
  with check (public.my_role() in ('admin','foreman','field_crew'));

create policy "logs_delete" on public.maintenance_logs for delete
  using (public.my_role() = 'admin');

-- DAMAGE REPORTS: anyone can insert; foreman/office/admin can see all; crew sees own
create policy "damage_select" on public.damage_reports for select
  using (public.my_role() in ('admin','operations','office_manager','foreman')
         or created_by = auth.uid());

create policy "damage_insert" on public.damage_reports for insert
  with check (auth.role() = 'authenticated');

create policy "damage_update" on public.damage_reports for update
  using (public.my_role() in ('admin','operations','foreman'));

-- INVOICES: only office_manager and admin
create policy "invoices_select" on public.invoices for select
  using (public.my_role() in ('admin','office_manager'));

create policy "invoices_insert" on public.invoices for insert
  with check (public.my_role() in ('admin','office_manager'));

create policy "invoices_delete" on public.invoices for delete
  using (public.my_role() = 'admin');

-- PM SCHEDULES: foreman and admin can manage; all can read
create policy "pm_select" on public.pm_schedules for select
  using (auth.role() = 'authenticated');

create policy "pm_insert" on public.pm_schedules for insert
  with check (public.my_role() in ('admin','foreman'));

create policy "pm_update" on public.pm_schedules for update
  using (public.my_role() in ('admin','foreman'));

create policy "pm_delete" on public.pm_schedules for delete
  using (public.my_role() in ('admin','foreman'));


-- ============================================================
-- SEED DATA — your initial assets
-- Add more rows or edit as needed before running
-- ============================================================

insert into public.assets (id, name, category, type, year, make, model) values
  ('ASP-001','Kenworth T880 Dump Truck','asphalt','truck','2019','Kenworth','T880'),
  ('ASP-002','Asphalt Paver','asphalt','equipment','2021','Vogele','Super 1800-3'),
  ('CON-001','Concrete Mixer Truck','concrete','truck','2018','Mack','Granite'),
  ('CON-002','Skid Steer Loader','concrete','skid steer','2020','Bobcat','S770'),
  ('LAN-001','Zero-Turn Mower','landscape','mower','2022','Husqvarna','MZ61'),
  ('LAN-002','Excavator Mini','landscape','excavator','2020','Kubota','KX057-5'),
  ('LAN-003','Commercial Blower','landscape','blower','2023','Stihl','BR 800'),
  ('LAN-004','String Trimmer','landscape','trimmer','2023','Husqvarna','525LST'),
  ('GEN-001','Utility Trailer 16ft','general','trailer','2017','PJ Trailers','L8J162');
