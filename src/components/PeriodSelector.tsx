
export default function PeriodSelector({ period, onChange }) {

    return (<select className="text-xs text-muted-foreground w-full" value={period} onChange={e => onChange(Number(e.target.value))}>
        <option value={0}>Este mês</option>
        <option value={1}>Últimos 2 meses</option>
        <option value={2}>Últimos 3 meses</option>
        <option value={5}>Último 6 meses</option>
        <option value={11}>Último ano</option>
    </select>)
}