
export default function RangeSelector({ value, onChange }){

    const handleChange = (ev:any) => {
        if( onChange ) {
            onChange( ev.target.value )
        }
    }

    return <span>
        <select className="text-xs text-muted-foreground w-full" value={value} defaultValue={0} onChange={handleChange}>
            <option value={0}>Essa semana</option>
            <option value={1}>Este mês</option>
            <option value={3}>Últimos três meses</option>
            <option value={6}>Últimos seis meses</option>
        </select>
        {/*<p className="text-xs text-muted-foreground">Este mês</p>*/}
    </span>
}