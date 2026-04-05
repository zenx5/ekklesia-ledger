import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, FileSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PeriodFilter from "@/components/PeriodFilter";
import { generateGeneralPDF } from "@/lib/pdf-reports";

interface ReportEntry {
  id: string;
  data_culto: string;
  total_arrecadacao: number;
  dizimos_total: number;
  ofertas_gerais: number;
  preletor: string | null;
}

interface ExpenseEntry {
  id: string;
  data_saida: string;
  descricao: string;
  valor: number;
  categoria: string | null;
  forma_pagamento: string;
}

function lastMonth(date: string) {
  const fecha = new Date(`${date}T00:00:00`);
  fecha.setDate(fecha.getDate() - 30);
  return fecha.toISOString().split('T')[0];
}

export default function Relatorios() {
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [entradas, setEntradas] = useState<ReportEntry[]>([]);
  const [saidas, setSaidas] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lastTotalSaidas, setLastTotalSaidas] = useState(0);

  const fetchReport = async () => {
    if (!dataInicio || !dataFim) {
      toast({ title: "Informe o período", description: "Preencha a data inicial e final.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSearched(true);

    async function fetchData(dataInicio: string, dataFim: string) {
      return await Promise.all([
        supabase
          .from("financial_reports")
          .select("id, data_culto, total_arrecadacao, observacoes, dizimos_total, ofertas_gerais, preletor")
          .is("deleted_at", null)
          .gte("data_culto", dataInicio)
          .lte("data_culto", dataFim)
          .order("data_culto", { ascending: true }),
        supabase
          .from("expenses")
          .select("id, data_saida, descricao, valor, categoria, forma_pagamento")
          .is("deleted_at", null)
          .gte("data_saida", dataInicio)
          .lte("data_saida", dataFim)
          .order("data_saida", { ascending: true }),
      ]);
    }

    try {
      const [{ data: entradasData }, { data: saidasData }] = await fetchData(dataInicio, dataFim);
      
      const [{ data: lastEntradasData }, { data: lastSaidasData }] = await fetchData(lastMonth(dataInicio), lastMonth(dataFim));
      
      const lastTotalEntradas = lastEntradasData.reduce((sum, e) => sum + Number(e.total_arrecadacao || 0), 0);
      const lastTotalSaidas = lastSaidasData.reduce((sum, e) => sum + Number(e.valor || 0), 0);
      setLastTotalSaidas(lastTotalEntradas - lastTotalSaidas);

      setEntradas(entradasData || []);
      setSaidas(saidasData || []);
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
      toast({ title: "Erro", description: "Não foi possível carregar o relatório.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) =>
    new Date(date + "T12:00:00").toLocaleDateString("pt-BR");

  const totalEntradas = entradas.reduce((sum, e) => sum + Number(e.total_arrecadacao || 0), 0);
  const totalSaidas = saidas.reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Relatório de entradas e saídas por período</p>
        </div>

        {/* Period Filter */}
        <PeriodFilter
          label="Gerar Relatório"
          loading={loading}
          dataInicio={dataInicio}
          dataFim={dataFim}
          onChangeInicio={setDataInicio}
          onChangeFim={setDataFim}
          onClick={fetchReport}
          labelAction="Imprimir"
          onAction={
            dataInicio && dataFim && (entradas.length > 0 || saidas.length > 0) ? 
            () => generateGeneralPDF(dataInicio, dataFim, {
              entradas,
              saidas,
              summary: {
                entradas: formatCurrency(totalEntradas),
                saidas: formatCurrency(totalSaidas),
                past: formatCurrency(lastTotalSaidas),
                saldo: formatCurrency(saldo)
              }
            }) :
            undefined
          }
        />

        {searched && !loading && (
          <>
            {/* Balancete / Cash Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Entradas</CardTitle>
                  <TrendingUp className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{formatCurrency(totalEntradas)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Saídas</CardTitle>
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo (Balancete)</CardTitle>
                  <DollarSign className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(saldo)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Entradas Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Entradas ({entradas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entradas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma entrada encontrada no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Preletor</TableHead>
                          <TableHead className="text-right">Dízimos</TableHead>
                          <TableHead className="text-right">Ofertas</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entradas.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{formatDate(e.data_culto)}</TableCell>
                            <TableCell>{e.preletor || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(e.dizimos_total || 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(e.ofertas_gerais || 0))}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(Number(e.total_arrecadacao || 0))}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Total Entradas</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(totalEntradas)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saidas Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  Saídas ({saidas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {saidas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma saída encontrada no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saidas.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{formatDate(s.data_saida)}</TableCell>
                            <TableCell>{s.descricao}</TableCell>
                            <TableCell>{s.categoria || "-"}</TableCell>
                            <TableCell className="capitalize">{s.forma_pagamento}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(s.valor))}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Total Saídas</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(totalSaidas)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balancete Summary */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Balancete do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Total de Entradas</TableCell>
                        <TableCell className="text-right text-success font-semibold">{formatCurrency(totalEntradas)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total de Saídas</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">{formatCurrency(totalSaidas)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Saldo Mes anterior</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(lastTotalSaidas)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold text-lg">Saldo Final</TableCell>
                        <TableCell className={`text-right font-bold text-lg ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(saldo)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
