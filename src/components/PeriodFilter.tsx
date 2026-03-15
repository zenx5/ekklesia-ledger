import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSearch } from "lucide-react";

export default function PeriodFilter({ label, dataInicio, dataFim, loading, onClick, onChangeInicio, onChangeFim }) {

    return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Data Inicial</Label>
                <Input type="date" value={dataInicio} onChange={(e) => onChangeInicio(e.target.value)} />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Data Final</Label>
                <Input type="date" value={dataFim} onChange={(e) => onChangeFim(e.target.value)} />
              </div>
              { onClick && <Button onClick={onClick} disabled={loading} className="w-full sm:w-auto">
                { label ? label : <><FileSearch className="mr-2" /> { loading ? "Buscando..." : "Gerar Relatório" }</> }
              </Button>}
            </div>
          </CardContent>
        </Card>
    )
}