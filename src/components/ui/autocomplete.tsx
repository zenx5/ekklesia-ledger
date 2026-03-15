import * as React from "react";
import { Input } from "./input"; // Ajusta la ruta a tu Input base
import { cn } from "@/lib/utils";

export interface AutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  options: string[];
  onValueChange?: (value: string) => void;
}

const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  ({ options, className, onValueChange, value, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState(value?.toString() || "");
    const [isOpen, setIsOpen] = React.useState(false);
    const [filteredOptions, setFilteredOptions] = React.useState<string[]>([]);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setInputValue(value?.toString() || "");
    }, [value]);
    React.useEffect(() => {
      if( options.length === 0 ) return
      if( inputValue.length > 0 ) return
      setFilteredOptions( options )
    }, [options, inputValue])

    // Cerrar la lista si se hace clic fuera del componente
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      onValueChange?.(val);

      if (val.length > 0) {
        const filtered = options.filter((op) =>
          op.toLowerCase().includes(val.toLowerCase())
        );
        setFilteredOptions(filtered);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    const handleSelectOption = (option: string) => {
      setInputValue(option);
      onValueChange?.(option);
      setIsOpen(false);
    };

    console.log( filteredOptions )

    return (
      <div className="relative w-full" ref={containerRef}>
        <Input
          {...props}
          ref={ref}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length > 0 && setIsOpen(true)}
          className={cn("w-full", className)}
          onClick={()=>setIsOpen(true)}
          autoComplete="off"
        />
        
        {isOpen && filteredOptions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            {filteredOptions.map((option, index) => (
              <li
                key={index}
                onClick={() => handleSelectOption(option)}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

Autocomplete.displayName = "Autocomplete";

export { Autocomplete };