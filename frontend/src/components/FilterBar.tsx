import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterBarProps {
  searchKey?: string;
  placeholder?: string;
}

export const FilterBar = ({
  searchKey = "q",
  placeholder = "Filter...",
}: FilterBarProps) => {
  const [params, setParams] = useSearchParams();
  const value = params.get(searchKey) ?? "";

  const setValue = (next: string) => {
    const p = new URLSearchParams(params);
    if (!next.trim()) p.delete(searchKey);
    else p.set(searchKey, next);
    p.delete("page");
    setParams(p, { replace: true });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="max-w-sm"
        aria-label={placeholder}
      />
      {value ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setValue("")}
          aria-label="Clear filters"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};
