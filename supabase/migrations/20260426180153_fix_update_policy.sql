DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);