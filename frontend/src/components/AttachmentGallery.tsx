import { Image, FileText, Film, File, Download, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/report-mock-data";

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return <Image className="h-5 w-5 text-primary" />;
  if (type.startsWith("video/")) return <Film className="h-5 w-5 text-secondary" />;
  if (type.includes("pdf") || type.includes("text")) return <FileText className="h-5 w-5 text-warning" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

interface AttachmentGalleryProps {
  attachments: Attachment[];
}

export const AttachmentGallery = ({ attachments }: AttachmentGalleryProps) => {
  if (!attachments.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Attachments ({attachments.length})</h3>
      <div className="grid gap-2">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
            {fileIcon(att.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatSize(att.size)}</span>
                {att.scanStatus === "clean" && (
                  <span className="flex items-center gap-0.5 text-xs text-success">
                    <ShieldCheck className="h-3 w-3" /> Clean
                  </span>
                )}
                {att.scanStatus === "pending" && (
                  <span className="flex items-center gap-0.5 text-xs text-warning">
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
