
INSERT INTO public.system_views (name, label, path, icon)
VALUES ('relatorios', 'Relatórios', '/relatorios', 'BarChart3')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT cr.id, sv.id, true, true, true, true
FROM public.custom_roles cr, public.system_views sv
WHERE cr.name = 'admin' AND sv.name = 'relatorios'
ON CONFLICT (role_id, view_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, view_id, can_view, can_create, can_update, can_delete)
SELECT cr.id, sv.id, false, false, false, false
FROM public.custom_roles cr, public.system_views sv
WHERE cr.name IN ('operador','auditor') AND sv.name = 'relatorios'
ON CONFLICT (role_id, view_id) DO NOTHING;
