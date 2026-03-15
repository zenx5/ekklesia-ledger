import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Loader2, Trash2, Pencil, Printer } from "lucide-react";
import { generateSaidaPDF } from "@/lib/pdf-reports";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Expense {
  id: string;
  data_saida: string;
  descricao: string;
  categoria: string;
  valor: number;
  forma_pagamento: string;
  responsavel: string;
  observacoes: string;
  created_at: string;
}

const CATEGORIES = [
  "Manutenção",
  "Limpeza",
  "Água/Luz",
  "Material de escritório",
  "Eventos",
  "Ajuda social",
  "Transporte",
  "Alimentação",
  "Outros",
];

const defaultForm = {
  data_saida: new Date().toISOString().split("T")[0],
  descricao: "",
  categoria: "",
  valor: 0,
  forma_pagamento: "dinheiro" as "dinheiro" | "pix" | "transferencia" | "boleto",
  responsavel: "",
  observacoes: "",
};

export default function Saidas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("data_saida", { ascending: false })
      .limit(20);

    if (data) setExpenses(data as Expense[]);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Eliminado", description: "Registro eliminado correctamente." });
      fetchExpenses();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      data_saida: expense.data_saida,
      descricao: expense.descricao,
      categoria: expense.categoria || "",
      valor: expense.valor,
      forma_pagamento: expense.forma_pagamento as "dinheiro" | "pix" | "transferencia" | "boleto",
      responsavel: expense.responsavel || "",
      observacoes: expense.observacoes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.descricao || formData.valor <= 0) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos obrigatórios" });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("expenses")
          .update({
            data_saida: formData.data_saida,
            descricao: formData.descricao,
            categoria: formData.categoria,
            valor: formData.valor,
            forma_pagamento: formData.forma_pagamento,
            responsavel: formData.responsavel,
            observacoes: formData.observacoes,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Saída atualizada com sucesso." });
      } else {
        const { error } = await supabase.from("expenses").insert({
          user_id: user.id,
          data_saida: formData.data_saida,
          descricao: formData.descricao,
          categoria: formData.categoria,
          valor: formData.valor,
          forma_pagamento: formData.forma_pagamento,
          responsavel: formData.responsavel,
          observacoes: formData.observacoes,
        });

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Saída registrada com sucesso." });
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData(defaultForm);
      fetchExpenses();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) => new Date(date+ 'T12:00:00').toLocaleDateString('pt-BR');

  const getPaymentLabel = (payment: string) => {
    const labels: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência", boleto: "Boleto" };
    return labels[payment] || payment;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Registro de Saídas</h1>
            <p className="text-muted-foreground">Registre os gastos e despesas da igreja</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setFormData(defaultForm); } }}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Saída
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Saída" : "Registrar Saída"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data *</Label>
                    <Input id="data" type="date" value={formData.data_saida} onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input id="valor" type="number" min="0" step="0.01" value={formData.valor || ""} onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição da despesa" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pagamento">Forma de Pagamento</Label>
                    <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value as "dinheiro" | "pix" | "transferencia" | "boleto" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input id="responsavel" value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} placeholder="Nome do responsável" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Observações adicionais..." rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saídas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma saída encontrada</TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.data_saida)}</TableCell>
                      <TableCell>{expense.descricao}</TableCell>
                      <TableCell>{expense.categoria || "-"}</TableCell>
                      <TableCell>{getPaymentLabel(expense.forma_pagamento)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{formatCurrency(Number(expense.valor))}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateSaidaPDF(expense)} title="Imprimir PDF">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción ocultará el registro de la lista. Los datos se conservarán para auditoría.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(expense.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
