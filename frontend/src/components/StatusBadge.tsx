import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  SUBMITTED: { label: "Submitted", className: "bg-secondary/15 text-secondary border-secondary/30" },
  RECEIVED: { label: "Received", className: "bg-secondary/15 text-secondary border-secondary/30" },
  NEEDS_INFO: { label: "Needs Info", className: "bg-warning/15 text-yellow-600 border-warning/30" },
  TRIAGING: { label: "Triaging", className: "bg-primary/15 text-primary border-primary/30" },
  ACCEPTED: { label: "Accepted", className: "bg-success/15 text-green-600 border-success/30" },
  DUPLICATE: { label: "Duplicate", className: "bg-muted text-muted-foreground border-border" },
  INFORMATIVE: { label: "Informative", className: "bg-muted text-muted-foreground border-border" },
  NOT_APPLICABLE: { label: "N/A", className: "bg-muted text-muted-foreground border-border" },
  OUT_OF_SCOPE: { label: "Out of Scope", className: "bg-muted text-muted-foreground border-border" },
  RESOLVED: { label: "Resolved", className: "bg-success/15 text-green-600 border-success/30" },
  REWARDED: { label: "Rewarded", className: "bg-success/20 text-green-600 border-success/40" },
  CLOSED: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
  ESCALATED: { label: "Escalated", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium text-[11px] px-2 py-0.5", config.className, className)}>
      {config.label}
    </Badge>
  );
};
