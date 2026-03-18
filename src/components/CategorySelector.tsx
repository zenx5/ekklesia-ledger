import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CATEGORIES = [
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

interface CategorySelectorProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  otherValue: string;
  onOtherValueChange: (value: string) => void;
  required?: boolean;
}

export default function CategorySelector({
  label = "Categoria",
  value,
  onValueChange,
  otherValue,
  onOtherValueChange,
  required = false,
}: CategorySelectorProps) {
  const selectedValue = useMemo(() => {
    return CATEGORIES.includes(value) ? value : "Outros";
  }, [value]);

  const showOtherInput = selectedValue === "Outros";

  return (
    <div className="space-y-2">
      <Label htmlFor="categoria">{label}{required ? " *" : ""}</Label>
      <Select value={selectedValue} onValueChange={(newValue) => onValueChange(newValue)}>
        <SelectTrigger id="categoria"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showOtherInput && (
        <Input
          id="categoria-outros"
          value={otherValue}
          onChange={(e) => onOtherValueChange(e.target.value)}
          placeholder="Escreva a categoria"
        />
      )}
    </div>
  );
}
