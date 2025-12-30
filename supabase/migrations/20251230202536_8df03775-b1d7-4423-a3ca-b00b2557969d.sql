-- Create table for custom roles
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert system roles
INSERT INTO public.custom_roles (name, description, is_system) VALUES
  ('admin', 'Administrador do sistema com acesso total', true),
  ('operador', 'Operador com acesso limitado', true);

-- Create table for views/pages
CREATE TABLE public.system_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  path text NOT NULL,
  icon text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert available views
INSERT INTO public.system_views (name, label, path, icon) VALUES
  ('dashboard', 'Dashboard', '/dashboard', 'LayoutDashboard'),
  ('entradas', 'Entradas', '/entradas', 'TrendingUp'),
  ('saidas', 'Saídas', '/saidas', 'TrendingDown'),
  ('auditoria', 'Auditoria', '/auditoria', 'FileText'),
  ('usuarios', 'Usuários', '/usuarios', 'Users'),
  ('permissoes', 'Permissões', '/permissoes', 'Shield');

-- Create table for role permissions (CRUD per view)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  view_id uuid REFERENCES public.system_views(id) ON DELETE CASCADE NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(role_id, view_id)
);

-- Grant admin full access to all views
INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT 
  cr.id as role_id,
  sv.id as view_id,
  true, true, true, true
FROM public.custom_roles cr
CROSS JOIN public.system_views sv
WHERE cr.name = 'admin';

-- Grant operador access to dashboard, entradas, saidas (view and create)
INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT 
  cr.id as role_id,
  sv.id as view_id,
  true,
  CASE WHEN sv.name IN ('entradas', 'saidas') THEN true ELSE false END,
  CASE WHEN sv.name IN ('entradas', 'saidas') THEN true ELSE false END,
  false
FROM public.custom_roles cr
CROSS JOIN public.system_views sv
WHERE cr.name = 'operador' AND sv.name IN ('dashboard', 'entradas', 'saidas');

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_roles
CREATE POLICY "Everyone can view roles" ON public.custom_roles
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage roles" ON public.custom_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for system_views
CREATE POLICY "Everyone can view system views" ON public.system_views
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage views" ON public.system_views
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for role_permissions
CREATE POLICY "Everyone can view permissions" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage permissions" ON public.role_permissions
  FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger for updated_at on custom_roles
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on role_permissions
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get user permissions for a specific view
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid, _view_name text)
RETURNS TABLE(can_view boolean, can_create boolean, can_update boolean, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rp.can_view,
    rp.can_create,
    rp.can_update,
    rp.can_delete
  FROM public.user_roles ur
  JOIN public.custom_roles cr ON cr.name = ur.role::text
  JOIN public.role_permissions rp ON rp.role_id = cr.id
  JOIN public.system_views sv ON sv.id = rp.view_id
  WHERE ur.user_id = _user_id AND sv.name = _view_name
$$;

-- Function to check if user can access a view
CREATE OR REPLACE FUNCTION public.can_access_view(_user_id uuid, _view_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.name = ur.role::text
    JOIN public.role_permissions rp ON rp.role_id = cr.id
    JOIN public.system_views sv ON sv.id = rp.view_id
    WHERE ur.user_id = _user_id 
      AND sv.name = _view_name 
      AND rp.can_view = true
  )
$$;