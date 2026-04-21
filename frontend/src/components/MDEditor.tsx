import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Edit3 } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cn } from "@/lib/utils";

interface MDEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  minRows?: number;
}

export const MDEditor = ({ value, onChange, placeholder, label, required, minRows = 6 }: MDEditorProps) => {
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={!preview ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPreview(false)}
            >
              <Edit3 className="h-3 w-3" /> Write
            </Button>
            <Button
              type="button"
              variant={preview ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setPreview(true)}
            >
              <Eye className="h-3 w-3" /> Preview
            </Button>
          </div>
        </div>
      )}
      {preview ? (
        <div className={cn("min-h-[150px] rounded-md border border-input bg-background p-3")}>
          {value ? (
            <MarkdownContent body={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          className="font-mono text-sm resize-y"
        />
      )}
    </div>
  );
};
