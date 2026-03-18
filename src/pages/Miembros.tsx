import { useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import TablePagination from "@/components/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";

interface Member {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  data_membro: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface MemberFormData {
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  data_nascimento: string;
  data_membro: string;
  status: string;
  observacoes: string;
}

const initialFormData: MemberFormData = {
  nome: "",
  email: "",
  telefone: "",
  endereco: "",
  data_nascimento: "",
  data_membro: "",
  status: "ativo",
  observacoes: "",
};

const Miembros = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data as Member[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const { error } = await supabase.from("members").insert({
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        endereco: data.endereco || null,
        data_nascimento: data.data_nascimento || null,
        data_membro: data.data_membro || null,
        status: data.status,
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membro criado com sucesso");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar membro: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MemberFormData }) => {
      const { error } = await supabase
        .from("members")
        .update({
          nome: data.nome,
          email: data.email || null,
          telefone: data.telefone || null,
          endereco: data.endereco || null,
          data_nascimento: data.data_nascimento || null,
          data_membro: data.data_membro || null,
          status: data.status,
          observacoes: data.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membro atualizado com sucesso");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar membro: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membro removido com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir membro: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingMember(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      nome: member.nome,
      email: member.email || "",
      telefone: member.telefone || "",
      endereco: member.endereco || "",
      data_nascimento: member.data_nascimento || "",
      data_membro: member.data_membro || "",
      status: member.status,
      observacoes: member.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.telefone?.includes(searchTerm)
  );

  const { currentPage, totalPages, paginatedItems, setCurrentPage, totalItems, pageSize } = usePagination(filteredMembers);

  const activeCount = members.filter((m) => m.status === "ativo").length;
  const inactiveCount = members.filter((m) => m.status === "inativo").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membros</h1>
          <p className="text-muted-foreground">
            Controle de membros da igreja
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Editar Membro" : "Novo Membro"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefono</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) =>
                      setFormData({ ...formData, endereco: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_nascimento: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_membro">Data de Adesão</Label>
                    <Input
                      id="data_membro"
                      type="date"
                      value={formData.data_membro}
                      onChange={(e) =>
                        setFormData({ ...formData, data_membro: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observaciones</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {editingMember ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de membros</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquise por nome, e-mail ou número de telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telefono</TableHead>
              <TableHead className="hidden lg:table-cell">
                Data de adesão
              </TableHead>
              <TableHead>Estado</TableHead>
              {isAdmin && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchTerm
                    ? "Não foram encontrados membros"
                    : "Não há membros registrados"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {member.email || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {member.telefone || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {member.data_membro
                      ? format(new Date(member.data_membro), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === "ativo"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.status === "ativo" ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza de que deseja remover este membro?")) {
                              deleteMutation.mutate(member.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>
    </div>
  </AppLayout>
  );
};

export default Miembros;
