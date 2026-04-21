import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const severityConfig: Record<Severity, { label: string; className: string }> = {
  CRITICAL: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" },
  HIGH: { label: "High", className: "bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/20" },
  MEDIUM: { label: "Medium", className: "bg-warning/15 text-yellow-600 border-warning/30 hover:bg-warning/20" },
  LOW: { label: "Low", className: "bg-secondary/40 text-secondary border-secondary/60 hover:bg-secondary/50" },
  INFORMATIONAL: { label: "Info", className: "bg-muted text-muted-foreground border-border hover:bg-muted/80" },
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => {
  const config = severityConfig[severity];
  return (
    <Badge variant="outline" className={cn("font-medium text-[11px] px-2 py-0.5", config.className, className)}>
      {config.label}
    </Badge>
  );
};
