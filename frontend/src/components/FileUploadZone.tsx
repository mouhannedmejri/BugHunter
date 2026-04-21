import { useCallback, useRef } from "react";
import { Upload, X, FileText, Image, Film, File, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  scanStatus: "pending" | "clean";
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  maxSize?: number; // bytes
  accept?: string;
}

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-primary" />;
  if (type.startsWith("video/")) return <Film className="h-4 w-4 text-secondary" />;
  if (type.includes("pdf") || type.includes("text")) return <FileText className="h-4 w-4 text-warning" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const FileUploadZone = ({
  files,
  onFiles,
  onRemove,
  maxSize = 25 * 1048576,
  accept = "image/*,video/*,.pdf,.har,.txt,.json,.zip",
}: FileUploadZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files).filter((f) => f.size <= maxSize);
      if (dropped.length) onFiles(dropped);
    },
    [onFiles, maxSize]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []).filter((f) => f.size <= maxSize);
      if (selected.length) onFiles(selected);
      e.target.value = "";
    },
    [onFiles, maxSize]
  );

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">
          Max {formatSize(maxSize)} per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              {fileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                  {file.progress < 100 && (
                    <Progress value={file.progress} className="h-1.5 flex-1 max-w-[120px]" />
                  )}
                  {file.progress >= 100 && file.scanStatus === "pending" && (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <Loader2 className="h-3 w-3 animate-spin" /> Scanning…
                    </span>
                  )}
                  {file.scanStatus === "clean" && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <ShieldCheck className="h-3 w-3" /> Clean
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(file.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
