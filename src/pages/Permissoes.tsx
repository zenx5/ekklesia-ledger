import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Shield, Edit, Trash2, Eye, PenSquare, Trash, Save } from "lucide-react";
import { z } from "zod";

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

interface SystemView {
  id: string;
  name: string;
  label: string;
  path: string;
  icon: string | null;
}

interface RolePermission {
  id: string;
  role_id: string;
  view_id: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  view?: SystemView;
}

const roleSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50),
  description: z.string().max(255).optional(),
});

export default function Permissoes() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [views, setViews] = useState<SystemView[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [editRole, setEditRole] = useState({ id: "", name: "", description: "" });
  const [editingPermissions, setEditingPermissions] = useState<Record<string, RolePermission>>({});

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [rolesRes, viewsRes, permissionsRes] = await Promise.all([
        supabase.from("custom_roles").select("*").order("is_system", { ascending: false }).order("name"),
        supabase.from("system_views").select("*").order("label"),
        supabase.from("role_permissions").select("*"),
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (viewsRes.data) setViews(viewsRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const validation = roleSchema.safeParse(newRole);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSaving(true);
      
      // Check if role name already exists
      const existingRole = roles.find(r => r.name.toLowerCase() === newRole.name.toLowerCase());
      if (existingRole) {
        toast.error("Já existe um papel com esse nome");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("custom_roles")
        .insert({
          name: newRole.name.toLowerCase().replace(/\s+/g, "_"),
          description: newRole.description || null,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Create default permissions (all false) for all views
      const permissionsToInsert = views.map((view) => ({
        role_id: roleData.id,
        view_id: view.id,
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      }));

      const { error: permError } = await supabase
        .from("role_permissions")
        .insert(permissionsToInsert);

      if (permError) throw permError;

      toast.success("Papel criado com sucesso");
      setIsCreateDialogOpen(false);
      setNewRole({ name: "", description: "" });
      fetchData();
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Erro ao criar papel");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    try {
      const validation = roleSchema.safeParse(editRole);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSaving(true);

      const { error } = await supabase
        .from("custom_roles")
        .update({
          name: editRole.name.toLowerCase().replace(/\s+/g, "_"),
          description: editRole.description || null,
        })
        .eq("id", editRole.id);

      if (error) throw error;

      toast.success("Papel atualizado com sucesso");
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar papel");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Tem certeza que deseja excluir este papel?")) return;

    try {
      const { error } = await supabase.from("custom_roles").delete().eq("id", roleId);
      if (error) throw error;

      toast.success("Papel excluído com sucesso");
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
        setEditingPermissions({});
      }
      fetchData();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Erro ao excluir papel");
    }
  };

  const handleSelectRole = (role: CustomRole) => {
    setSelectedRole(role);
    const rolePerms = permissions.filter((p) => p.role_id === role.id);
    const permsMap: Record<string, RolePermission> = {};
    rolePerms.forEach((p) => {
      permsMap[p.view_id] = p;
    });
    setEditingPermissions(permsMap);
  };

  const handlePermissionChange = (
    viewId: string,
    field: "can_view" | "can_create" | "can_update" | "can_delete",
    value: boolean
  ) => {
    setEditingPermissions((prev) => {
      const existing = prev[viewId] || {
        id: "",
        role_id: selectedRole?.id || "",
        view_id: viewId,
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      };
      
      // If enabling create/update/delete, also enable view
      let updates: Partial<RolePermission> = { [field]: value };
      if (value && field !== "can_view") {
        updates.can_view = true;
      }
      
      // If disabling view, disable all other permissions
      if (!value && field === "can_view") {
        updates = {
          can_view: false,
          can_create: false,
          can_update: false,
          can_delete: false,
        };
      }

      return {
        ...prev,
        [viewId]: { ...existing, ...updates },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      setIsSaving(true);

      const updates = Object.values(editingPermissions).map((p) => ({
        role_id: selectedRole.id,
        view_id: p.view_id,
        can_view: p.can_view,
        can_create: p.can_create,
        can_update: p.can_update,
        can_delete: p.can_delete,
      }));

      // Delete existing permissions for this role
      await supabase.from("role_permissions").delete().eq("role_id", selectedRole.id);

      // Insert new permissions
      const { error } = await supabase.from("role_permissions").insert(updates);

      if (error) throw error;

      toast.success("Permissões salvas com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Permissões</h1>
            <p className="text-muted-foreground">
              Crie papéis e defina permissões de acesso às vistas
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Papel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Papel</DialogTitle>
                <DialogDescription>
                  Defina o nome e descrição do novo papel de usuário
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Papel</Label>
                  <Input
                    id="name"
                    placeholder="Ex: tesoureiro"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição do papel..."
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRole} disabled={isSaving}>
                  {isSaving ? "Criando..." : "Criar Papel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Papéis
              </CardTitle>
              <CardDescription>Selecione um papel para editar permissões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRole?.id === role.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => handleSelectRole(role)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{role.name}</span>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    {!role.is_system && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRole({
                              id: role.id,
                              name: role.name,
                              description: role.description || "",
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Permissions Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedRole
                  ? `Permissões: ${selectedRole.name}`
                  : "Selecione um Papel"}
              </CardTitle>
              <CardDescription>
                {selectedRole
                  ? "Configure as permissões de acesso para cada vista"
                  : "Clique em um papel para editar suas permissões"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRole ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vista</TableHead>
                        <TableHead className="text-center w-20">
                          <div className="flex flex-col items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs">Ver</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-20">
                          <div className="flex flex-col items-center gap-1">
                            <Plus className="w-4 h-4" />
                            <span className="text-xs">Criar</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-20">
                          <div className="flex flex-col items-center gap-1">
                            <PenSquare className="w-4 h-4" />
                            <span className="text-xs">Editar</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center w-20">
                          <div className="flex flex-col items-center gap-1">
                            <Trash className="w-4 h-4" />
                            <span className="text-xs">Excluir</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {views.map((view) => {
                        const perm = editingPermissions[view.id] || {
                          can_view: false,
                          can_create: false,
                          can_update: false,
                          can_delete: false,
                        };
                        return (
                          <TableRow key={view.id}>
                            <TableCell className="font-medium">{view.label}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm.can_view}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(view.id, "can_view", !!checked)
                                }
                                disabled={selectedRole.is_system && selectedRole.name === "admin"}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm.can_create}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(view.id, "can_create", !!checked)
                                }
                                disabled={selectedRole.is_system && selectedRole.name === "admin"}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm.can_update}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(view.id, "can_update", !!checked)
                                }
                                disabled={selectedRole.is_system && selectedRole.name === "admin"}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm.can_delete}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(view.id, "can_delete", !!checked)
                                }
                                disabled={selectedRole.is_system && selectedRole.name === "admin"}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePermissions}
                      disabled={isSaving || (selectedRole.is_system && selectedRole.name === "admin")}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Salvando..." : "Salvar Permissões"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mb-4 opacity-50" />
                  <p>Selecione um papel para ver e editar suas permissões</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Papel</DialogTitle>
            <DialogDescription>Atualize o nome e descrição do papel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Papel</Label>
              <Input
                id="edit-name"
                value={editRole.name}
                onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editRole.description}
                onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
