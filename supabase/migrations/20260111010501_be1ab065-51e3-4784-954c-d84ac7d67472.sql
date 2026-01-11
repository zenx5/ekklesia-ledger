
-- Create members table for church membership control
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  data_nascimento DATE,
  data_membro DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can view, only admins can manage
CREATE POLICY "Authenticated users can view members"
ON public.members FOR SELECT
USING (true);

CREATE POLICY "Admins can insert members"
ON public.members FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update members"
ON public.members FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE
USING (is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add members view to system_views
INSERT INTO public.system_views (name, label, path, icon)
VALUES ('members', 'Miembros', '/miembros', 'Users');

-- Give admin full access to members view
INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT cr.id, sv.id, true, true, true, true
FROM public.custom_roles cr, public.system_views sv
WHERE cr.name = 'admin' AND sv.name = 'members';

-- Give operador view-only access to members
INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT cr.id, sv.id, true, false, false, false
FROM public.custom_roles cr, public.system_views sv
WHERE cr.name = 'operador' AND sv.name = 'members';
