-- Fix: Add 'operations' role to damage_reports RLS policies
-- Operations users should be able to see all damage reports and update their status

-- Drop and recreate the select policy to include operations
DROP POLICY IF EXISTS "damage_select" ON public.damage_reports;
CREATE POLICY "damage_select" ON public.damage_reports FOR SELECT
  USING (public.my_role() IN ('admin','operations','office_manager','foreman')
         OR created_by = auth.uid());

-- Drop and recreate the update policy to include operations
DROP POLICY IF EXISTS "damage_update" ON public.damage_reports;
CREATE POLICY "damage_update" ON public.damage_reports FOR UPDATE
  USING (public.my_role() IN ('admin','operations','foreman'));
