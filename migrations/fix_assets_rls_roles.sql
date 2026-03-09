-- Fix assets RLS: allow operations and office_manager to insert and update assets
-- Previously only 'admin' was permitted

drop policy if exists "assets_insert" on public.assets;
drop policy if exists "assets_update" on public.assets;

create policy "assets_insert" on public.assets for insert
  with check (public.my_role() in ('admin', 'operations', 'office_manager'));

create policy "assets_update" on public.assets for update
  using (public.my_role() in ('admin', 'operations', 'office_manager'));
