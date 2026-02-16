import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Autocomplete } from "@/components/ui/autocomplete";
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

interface Tither {
  id?: string;
  nome: string;
  valor: number;
  forma_pagamento: "dinheiro" | "pix" | "transferencia" | "boleto";
}

interface Report {
  id: string;
  data_culto: string;
  pastores_presentes: string;
  preletor: string;
  total_arrecadacao: number;
  created_at: string;
}

const defaultFormData = {
  data_culto: new Date().toISOString().split("T")[0],
  pastores_presentes: "",
  diaconos_servico: "",
  preletor: "",
  quantidade_presentes: 0,
  quantidade_visitantes: 0,
  quantidade_batizados: 0,
  ofertas_gerais: 0,
  observacoes: "",
};

export default function Entradas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; nome: string }[]>([]);
  const [formData, setFormData] = useState(defaultFormData);
  const [tithers, setTithers] = useState<Tither[]>([
    { nome: "", valor: 0, forma_pagamento: "dinheiro" },
  ]);

  useEffect(() => {
    fetchMembers();
    fetchReports();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from("members").select("*");
    if (data) setMembers(data.filter((item) => item.status === "ativo"));
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from("financial_reports")
      .select("id, data_culto, pastores_presentes, preletor, total_arrecadacao, created_at")
      .is("deleted_at", null)
      .order("data_culto", { ascending: false })
      .limit(20);

    if (data) setReports(data);
  };

  const dizimosTotal = tithers.reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
  const totalArrecadacao = (Number(formData.ofertas_gerais) || 0) + dizimosTotal;

  const addTither = () => {
    setTithers([...tithers, { nome: "", valor: 0, forma_pagamento: "dinheiro" }]);
  };

  const removeTither = (index: number) => {
    if (tithers.length > 1) {
      setTithers(tithers.filter((_, i) => i !== index));
    }
  };

  const updateTither = (index: number, field: keyof Tither, value: string | number) => {
    const updated = [...tithers];
    updated[index] = { ...updated[index], [field]: value };
    setTithers(updated);
  };

  const handleDelete = async (id: string) => {
    try {
      // Soft delete the report
      const { error } = await supabase
        .from("financial_reports")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Soft delete associated tithers
      await supabase
        .from("tithers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("report_id", id);

      toast({ title: "Eliminado", description: "Relatório eliminado correctamente." });
      fetchReports();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const openEdit = async (report: Report) => {
    setEditingId(report.id);

    // Fetch full report data
    const { data: fullReport } = await supabase
      .from("financial_reports")
      .select("*")
      .eq("id", report.id)
      .single();

    if (fullReport) {
      setFormData({
        data_culto: fullReport.data_culto,
        pastores_presentes: fullReport.pastores_presentes || "",
        diaconos_servico: fullReport.diaconos_servico || "",
        preletor: fullReport.preletor || "",
        quantidade_presentes: fullReport.quantidade_presentes || 0,
        quantidade_visitantes: fullReport.quantidade_visitantes || 0,
        quantidade_batizados: fullReport.quantidade_batizados || 0,
        ofertas_gerais: fullReport.ofertas_gerais || 0,
        observacoes: fullReport.observacoes || "",
      });
    }

    // Fetch tithers for this report
    const { data: reportTithers } = await supabase
      .from("tithers")
      .select("*")
      .eq("report_id", report.id)
      .is("deleted_at", null);

    if (reportTithers && reportTithers.length > 0) {
      setTithers(
        reportTithers.map((t) => ({
          id: t.id,
          nome: t.nome,
          valor: t.valor,
          forma_pagamento: t.forma_pagamento as "dinheiro" | "pix" | "transferencia" | "boleto",
        }))
      );
    } else {
      setTithers([{ nome: "", valor: 0, forma_pagamento: "dinheiro" }]);
    }

    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setTithers([{ nome: "", valor: 0, forma_pagamento: "dinheiro" }]);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (editingId) {
        // Update report
        const { error: reportError } = await supabase
          .from("financial_reports")
          .update({
            data_culto: formData.data_culto,
            pastores_presentes: formData.pastores_presentes,
            diaconos_servico: formData.diaconos_servico,
            preletor: formData.preletor,
            quantidade_presentes: formData.quantidade_presentes,
            quantidade_visitantes: formData.quantidade_visitantes,
            quantidade_batizados: formData.quantidade_batizados,
            ofertas_gerais: formData.ofertas_gerais,
            dizimos_total: dizimosTotal,
            total_arrecadacao: totalArrecadacao,
            observacoes: formData.observacoes,
          })
          .eq("id", editingId);

        if (reportError) throw reportError;

        // Soft delete old tithers, then insert new ones
        await supabase
          .from("tithers")
          .update({ deleted_at: new Date().toISOString() })
          .eq("report_id", editingId);

        const validTithers = tithers.filter((t) => t.nome && t.valor > 0);
        if (validTithers.length > 0) {
          const { error: tithersError } = await supabase.from("tithers").insert(
            validTithers.map((t) => ({
              report_id: editingId,
              nome: t.nome,
              valor: t.valor,
              forma_pagamento: t.forma_pagamento,
            }))
          );
          if (tithersError) throw tithersError;
        }

        toast({ title: "Sucesso!", description: "Relatório atualizado com sucesso." });
      } else {
        // Insert new report
        const { data: reportData, error: reportError } = await supabase
          .from("financial_reports")
          .insert({
            user_id: user.id,
            data_culto: formData.data_culto,
            pastores_presentes: formData.pastores_presentes,
            diaconos_servico: formData.diaconos_servico,
            preletor: formData.preletor,
            quantidade_presentes: formData.quantidade_presentes,
            quantidade_visitantes: formData.quantidade_visitantes,
            quantidade_batizados: formData.quantidade_batizados,
            ofertas_gerais: formData.ofertas_gerais,
            dizimos_total: dizimosTotal,
            total_arrecadacao: totalArrecadacao,
            observacoes: formData.observacoes,
          })
          .select()
          .single();

        if (reportError) throw reportError;

        const validTithers = tithers.filter((t) => t.nome && t.valor > 0);
        if (validTithers.length > 0 && reportData) {
          const { error: tithersError } = await supabase.from("tithers").insert(
            validTithers.map((t) => ({
              report_id: reportData.id,
              nome: t.nome,
              valor: t.valor,
              forma_pagamento: t.forma_pagamento,
            }))
          );
          if (tithersError) throw tithersError;
        }

        toast({ title: "Sucesso!", description: "Relatório financeiro salvo." });
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
      setTithers([{ nome: "", valor: 0, forma_pagamento: "dinheiro" }]);
      fetchReports();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatório Financeiro de Entradas</h1>
            <p className="text-muted-foreground">Registre as ofertas e dízimos dos cultos</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setFormData(defaultFormData); setTithers([{ nome: "", valor: 0, forma_pagamento: "dinheiro" }]); } }}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Relatório Financeiro" : "Novo Relatório Financeiro"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Section */}
                <Card>
                  <CardHeader className="ekklesia-header">
                    <CardTitle className="text-base">Informações do Culto</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data">Data</Label>
                      <Input id="data" type="date" value={formData.data_culto} onChange={(e) => setFormData({ ...formData, data_culto: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pastores">Pastores Presentes</Label>
                      <TagInput id="pastores" value={formData.pastores_presentes} onChange={(val) => setFormData({ ...formData, pastores_presentes: val })} placeholder="Digite e pressione Enter" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diaconos">Diáconos em Serviço</Label>
                      <TagInput id="diaconos" value={formData.diaconos_servico} onChange={(val) => setFormData({ ...formData, diaconos_servico: val })} placeholder="Digite e pressione Enter" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preletor">Preletor</Label>
                      <Input id="preletor" value={formData.preletor} onChange={(e) => setFormData({ ...formData, preletor: e.target.value })} placeholder="Nome do preletor" />
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Section */}
                <Card>
                  <CardHeader className="ekklesia-header">
                    <CardTitle className="text-base">Presença</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="presentes">Presentes</Label>
                      <Input id="presentes" type="number" min="0" value={formData.quantidade_presentes} onChange={(e) => setFormData({ ...formData, quantidade_presentes: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitantes">Visitantes</Label>
                      <Input id="visitantes" type="number" min="0" value={formData.quantidade_visitantes} onChange={(e) => setFormData({ ...formData, quantidade_visitantes: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batizados">Batizados/Recebidos</Label>
                      <Input id="batizados" type="number" min="0" value={formData.quantidade_batizados} onChange={(e) => setFormData({ ...formData, quantidade_batizados: Number(e.target.value) })} />
                    </div>
                  </CardContent>
                </Card>

                {/* Finances Section */}
                <Card>
                  <CardHeader className="ekklesia-header">
                    <CardTitle className="text-base">Finanças</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ofertas">Ofertas Gerais (R$)</Label>
                        <Input id="ofertas" type="number" min="0" step="0.01" value={formData.ofertas_gerais} onChange={(e) => setFormData({ ...formData, ofertas_gerais: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Dízimos (R$)</Label>
                        <Input value={formatCurrency(dizimosTotal)} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Total de Arrecadação (R$)</Label>
                        <Input value={formatCurrency(totalArrecadacao)} disabled className="bg-muted font-bold" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tithers Section */}
                <Card>
                  <CardHeader className="ekklesia-header flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Relação de Dizimistas</CardTitle>
                    <Button type="button" size="sm" variant="outline" onClick={addTither}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Table className="relative w-full">
                      <TableHeader>
                        <TableRow className="ekklesia-table-header">
                          <TableHead className="w-[200px]">Valor (R$)</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-[150px]">Forma de Pagamento</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tithers.map((tither, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input type="number" min="0" step="0.01" value={tither.valor || ""} onChange={(e) => updateTither(index, "valor", Number(e.target.value))} placeholder="0.00" />
                            </TableCell>
                            <TableCell>
                              <Autocomplete options={members.map((item) => item.nome)} value={tither.nome} onChange={(e) => updateTither(index, "nome", e.target.value)} placeholder="Nome do dizimista" />
                            </TableCell>
                            <TableCell>
                              <Select value={tither.forma_pagamento} onValueChange={(value) => updateTither(index, "forma_pagamento", value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="transferencia">Transferência</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeTither(index)} disabled={tithers.length === 1}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Observations */}
                <Card>
                  <CardHeader className="ekklesia-header">
                    <CardTitle className="text-base">Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Observações adicionais..." rows={3} />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingId ? "Atualizar Relatório" : "Salvar Relatório"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relatórios Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pastores</TableHead>
                  <TableHead>Preletor</TableHead>
                  <TableHead className="text-right">Total Arrecadado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum relatório encontrado</TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{formatDate(report.data_culto)}</TableCell>
                      <TableCell>{report.pastores_presentes || "-"}</TableCell>
                      <TableCell>{report.preletor || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(report.total_arrecadacao))}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(report)}>
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
                                <AlertDialogTitle>¿Eliminar relatório?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción ocultará el registro y sus dizimistas de la lista. Los datos se conservarán para auditoría.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(report.id)}>Eliminar</AlertDialogAction>
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
