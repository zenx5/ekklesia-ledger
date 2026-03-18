import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePagination } from "@/hooks/use-pagination";
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Json } from "@/integrations/supabase/types";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  created_at: string;
  old_data: Json | null;
  new_data: Json | null;
  profiles?: { nome: string } | null;
}

export default function Auditoria() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data: logsData } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsData) {
      // Filter out soft-delete operations (UPDATEs that set deleted_at)
      const filtered = logsData.filter((log) => {
        if (log.action === "UPDATE" && log.new_data && typeof log.new_data === "object" && !Array.isArray(log.new_data)) {
          const nd = log.new_data as Record<string, unknown>;
          if (nd.deleted_at && (!log.old_data || !(log.old_data as Record<string, unknown>).deleted_at)) {
            return false;
          }
        }
        return true;
      });

      const userIds = [...new Set(filtered.map((l) => l.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, nome")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      const logsWithProfiles = filtered.map((log) => ({
        ...log,
        profiles: profilesMap.get(log.user_id) || null,
      }));
      setLogs(logsWithProfiles as AuditLog[]);
    }
    setLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "default"}>{action}</Badge>;
  };

  const printPdf = () => {
    console.log( selectedLog )
    window.print();
  }

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      financial_reports: "Relatório Financeiro",
      expenses: "Saída",
      profiles: "Perfil",
      user_roles: "Função de Usuário",
      tithers: "Dizimista",
    };
    return labels[table] || table;
  };

  const openDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const renderJsonData = (data: Json | null, title: string) => {
    if (!data) return null;
    
    const formatValue = (key: string, value: unknown): string => {
      if (value === null || value === undefined) return "—";
      if (typeof value === "boolean") return value ? "Sim" : "Não";
      if (typeof value === "number") {
        if (key.includes("valor") || key.includes("total") || key.includes("ofertas") || key.includes("dizimos")) {
          return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
        }
        return value.toString();
      }
      if (typeof value === "string") {
        if (key.includes("data") || key.includes("created_at") || key.includes("updated_at")) {
          try {
            return new Date(value).toLocaleString("pt-BR");
          } catch {
            return value;
          }
        }
        return value;
      }
      return JSON.stringify(value);
    };

    const fieldLabels: Record<string, string> = {
      id: "ID",
      user_id: "ID do Usuário",
      data_culto: "Data do Culto",
      data_saida: "Data da Saída",
      quantidade_presentes: "Presentes",
      quantidade_visitantes: "Visitantes",
      quantidade_batizados: "Batizados",
      ofertas_gerais: "Ofertas Gerais",
      dizimos_total: "Total de Dízimos",
      total_arrecadacao: "Total Arrecadação",
      pastores_presentes: "Pastores Presentes",
      diaconos_servico: "Diáconos em Serviço",
      preletor: "Preletor",
      observacoes: "Observações",
      descricao: "Descrição",
      categoria: "Categoria",
      valor: "Valor",
      forma_pagamento: "Forma de Pagamento",
      responsavel: "Responsável",
      nome: "Nome",
      email: "Email",
      ativo: "Ativo",
      role: "Função",
      created_at: "Criado em",
      updated_at: "Atualizado em",
    };

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground">{title}</h4>
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{fieldLabels[key] || key}:</span>
              <span className="font-medium text-right max-w-[60%] break-words">
                {formatValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    return matchesSearch && matchesAction && matchesTable;
  });

  const { currentPage, totalPages, paginatedItems, setCurrentPage, totalItems, pageSize } = usePagination(filteredLogs, { pageSize: 15 });

  if (authLoading) {
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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Log de Auditoria</h1>
          <p className="text-muted-foreground">Histórico de todas as operações no sistema</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário ou tabela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="INSERT">Inserção</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  <SelectItem value="financial_reports">Relatórios</SelectItem>
                  <SelectItem value="expenses">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros de Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>ID do Registro</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((log) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(log)}>
                        <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.profiles?.nome || "Desconhecido"}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{getTableLabel(log.table_name)}</TableCell>
                        <TableCell className="font-mono text-xs">{log.record_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetails(log); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center gap-2">
                <span className="gap-2 flex items-center">
                  Detalhes do Registro
                  {selectedLog && getActionBadge(selectedLog.action)}
                </span>
                <Button className="mr-10 items-center flex no-print" size="sm" onClick={printPdf}>
                  <Printer />
                  <>Imprimir</>
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                    <div>
                      <span className="text-sm text-muted-foreground">Usuário:</span>
                      <p className="font-medium">{selectedLog.profiles?.nome || "Desconhecido"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Data/Hora:</span>
                      <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Tabela:</span>
                      <p className="font-medium">{getTableLabel(selectedLog.table_name)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">ID do Registro:</span>
                      <p className="font-mono text-sm">{selectedLog.record_id}</p>
                    </div>
                  </div>

                  {/* Data changes */}
                  {selectedLog.action === "INSERT" && renderJsonData(selectedLog.new_data, "Dados Inseridos")}
                  
                  {selectedLog.action === "UPDATE" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderJsonData(selectedLog.old_data, "Dados Anteriores")}
                      {renderJsonData(selectedLog.new_data, "Dados Novos")}
                    </div>
                  )}
                  
                  {selectedLog.action === "DELETE" && renderJsonData(selectedLog.old_data, "Dados Excluídos")}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
