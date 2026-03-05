-- Fix: Ensure 'operations' role has at least all permissions that 'foreman' has
-- Affected policies: logs_select, logs_insert, pm_insert, pm_update, pm_delete

-- MAINTENANCE LOGS: add operations to select and insert
DROP POLICY IF EXISTS "logs_select" ON public.maintenance_logs;
CREATE POLICY "logs_select" ON public.maintenance_logs FOR SELECT
  USING (public.my_role() IN ('admin','operations','office_manager','foreman')
         OR created_by = auth.uid());

DROP POLICY IF EXISTS "logs_insert" ON public.maintenance_logs;
CREATE POLICY "logs_insert" ON public.maintenance_logs FOR INSERT
  WITH CHECK (public.my_role() IN ('admin','operations','foreman','field_crew'));

-- PM SCHEDULES: add operations to insert, update, delete
DROP POLICY IF EXISTS "pm_insert" ON public.pm_schedules;
CREATE POLICY "pm_insert" ON public.pm_schedules FOR INSERT
  WITH CHECK (public.my_role() IN ('admin','operations','foreman'));

DROP POLICY IF EXISTS "pm_update" ON public.pm_schedules;
CREATE POLICY "pm_update" ON public.pm_schedules FOR UPDATE
  USING (public.my_role() IN ('admin','operations','foreman'));

DROP POLICY IF EXISTS "pm_delete" ON public.pm_schedules;
CREATE POLICY "pm_delete" ON public.pm_schedules FOR DELETE
  USING (public.my_role() IN ('admin','operations','foreman'));

-- DAMAGE REPORTS: already fixed in prior migration, but ensure it's correct
DROP POLICY IF EXISTS "damage_select" ON public.damage_reports;
CREATE POLICY "damage_select" ON public.damage_reports FOR SELECT
  USING (public.my_role() IN ('admin','operations','office_manager','foreman')
         OR created_by = auth.uid());

DROP POLICY IF EXISTS "damage_update" ON public.damage_reports;
CREATE POLICY "damage_update" ON public.damage_reports FOR UPDATE
  USING (public.my_role() IN ('admin','operations','foreman'));
