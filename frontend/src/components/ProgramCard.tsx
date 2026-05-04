import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, FileText, ArrowRight, Lock } from "lucide-react";
import type { Program } from "@/lib/mock-data";
import { formatCompactCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  PUBLIC: "bg-success/15 text-green-600 border-success/30",
  PRIVATE: "bg-primary/15 text-primary border-primary/30",
  CAMPAIGN: "bg-secondary/15 text-secondary border-secondary/30",
  CHALLENGE: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  EMERGENCY: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-success/15 text-green-600 border-success/30",
  PAUSED: "bg-warning/15 text-yellow-600 border-warning/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
  DRAFT: "bg-muted text-muted-foreground border-border",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
};

interface ProgramCardProps {
  program: Program;
}

export const ProgramCard = ({ program }: ProgramCardProps) => {
  const min = program.rewardRange?.min ?? 0;
  const max = program.rewardRange?.max ?? 0;
  const rewardLabel =
    program.rewardRange !== undefined && program.rewardRange !== null
      ? `${formatCompactCurrency(min)} – ${formatCompactCurrency(max)}`
      : "—";

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{program.title}</h3>
            <p className="text-sm text-muted-foreground">{program.orgName ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="outline" className={cn("text-[11px] font-medium", typeColors[program.type])}>
            {program.type === "PUBLIC" ? "Public" : program.type === "PRIVATE" ? "Private" : program.type.charAt(0) + program.type.slice(1).toLowerCase()}
          </Badge>
          <Badge variant="outline" className={cn("text-[11px] font-medium", statusColors[program.status])}>
            {program.status.charAt(0) + program.status.slice(1).toLowerCase()}
          </Badge>
          {program.requiresInvite && (
            <Badge variant="outline" className="text-[11px] font-medium bg-muted text-muted-foreground border-border">
              <Lock className="h-3 w-3 mr-1" /> Invite Only
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <div>
            <p className="text-muted-foreground text-xs">Reward Range</p>
            <p className="font-semibold text-foreground">
              {rewardLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Open Reports</p>
            <p className="font-semibold text-foreground flex items-center justify-end gap-1">
              <FileText className="h-3.5 w-3.5" /> {program.openReports}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
          <Link to={`/programs/${program.slug}`}>
            View Program <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
