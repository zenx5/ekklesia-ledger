import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  created_at: string;
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
      const userIds = [...new Set(logsData.map((l) => l.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, nome")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
      const logsWithProfiles = logsData.map((log) => ({
        ...log,
        profiles: profilesMap.get(log.user_id) || null,
      }));
      setLogs(logsWithProfiles as AuditLog[]);
    }
    setLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "default"}>{action}</Badge>;
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      financial_reports: "Relatório Financeiro",
      expenses: "Saída",
      profiles: "Perfil",
      user_roles: "Função de Usuário",
    };
    return labels[table] || table;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    return matchesSearch && matchesAction && matchesTable;
  });

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.profiles?.nome || "Desconhecido"}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{getTableLabel(log.table_name)}</TableCell>
                        <TableCell className="font-mono text-xs">{log.record_id?.slice(0, 8)}...</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
