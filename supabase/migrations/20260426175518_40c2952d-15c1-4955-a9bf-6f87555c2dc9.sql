-- financial_reports: admin puede actualizar cualquier registro
DROP POLICY IF EXISTS "Users can update own reports" ON public.financial_reports;
CREATE POLICY "Users can update own reports or admins any"
ON public.financial_reports
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- expenses: admin puede actualizar cualquier registro
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses or admins any"
ON public.expenses
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- tithers: mantener acceso para autenticados, asegurando admin
DROP POLICY IF EXISTS "Users can update tithers" ON public.tithers;
CREATE POLICY "Authenticated users can update tithers"
ON public.tithers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- profiles: admin puede actualizar cualquier perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admins any"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- members: garantizar que admins puedan actualizar (ya cubierto, pero explicitamos)
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
CREATE POLICY "Admins can update members"
ON public.members
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));