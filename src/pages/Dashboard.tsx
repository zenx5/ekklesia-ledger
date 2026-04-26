import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PeriodSelector from "@/components/PeriodSelector";

interface MonthlyData {
  month: string;
  entradas: number;
  saidas: number;
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentReports, setRecentReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(0); // defual 1 month (current)

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const getMonthRange = (monthsAgo) => {
    const ahora = new Date();
    // Fecha de inicio: Primero de mes hace 'n' meses
    const dataInicio = new Date(ahora.getFullYear(), ahora.getMonth() - monthsAgo, 1);
    // Formatear a YYYY-MM-DD para Supabase/PostgreSQL
    const format = (date) => date.toISOString().split('T')[0];

    return {
      dataInicio: format(dataInicio),
      dataFim: format(ahora)
    };
  };

  const fetchDashboardData = async () => {
    try {
      const { dataInicio, dataFim } = getMonthRange(period);
      // Fetch total entradas (current month)
      console.log( 'Dashboard', dataInicio, dataFim)
      const { data: entradasData } = await supabase
        .from("financial_reports")
        .select("total_arrecadacao,deleted_at")
        .is("deleted_at", null)
        .gte("data_culto", dataInicio)
        .lte("data_culto", dataFim)

      const entradasTotal = entradasData?.reduce((sum, r) => sum + Number(r.total_arrecadacao || 0), 0) || 0;
      setTotalEntradas(entradasTotal);

      // Fetch total saidas (current month)
      const { data: saidasData } = await supabase
        .from("expenses")
        .select("*")
        .is("deleted_at", null)
        .gte("data_saida", dataInicio)
        .lte("data_saida", dataFim)
      console.log( saidasData )
        const saidasTotal = saidasData?.reduce((sum, e) => sum + Number(e.valor || 0), 0) || 0;
      setTotalSaidas(saidasTotal);

      // Fetch recent reports count
      const { count } = await supabase
        .from("financial_reports")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("data_culto", dataInicio)
        .lte("data_culto", dataFim);
      setRecentReports(count || 0);

      // Fetch last 6 months data for chart
      const monthlyStats: MonthlyData[] = [];
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data: monthEntradas } = await supabase
          .from("financial_reports")
          .select("total_arrecadacao")
          .gte("data_culto", firstDay.toISOString().split("T")[0])
          .lte("data_culto", lastDay.toISOString().split("T")[0]);

        const { data: monthSaidas } = await supabase
          .from("expenses")
          .select("valor")
          .gte("data_saida", firstDay.toISOString().split("T")[0])
          .lte("data_saida", lastDay.toISOString().split("T")[0]);

        monthlyStats.push({
          month: months[date.getMonth()],
          entradas: monthEntradas?.reduce((sum, r) => sum + Number(r.total_arrecadacao || 0), 0) || 0,
          saidas: monthSaidas?.reduce((sum, e) => sum + Number(e.valor || 0), 0) || 0,
        });
      }

      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const saldo = totalEntradas - totalSaidas;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumo financeiro do mês atual</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Entradas
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : formatCurrency(totalEntradas)}
              </div>
              <PeriodSelector period={period} onChange={setPeriod} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Saídas
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? "..." : formatCurrency(totalSaidas)}
              </div>
              <PeriodSelector period={period} onChange={setPeriod} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo
              </CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                {loading ? "..." : formatCurrency(saldo)}
              </div>
              <PeriodSelector period={period} onChange={setPeriod} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Relatórios
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : recentReports}</div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentação dos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `R$${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
