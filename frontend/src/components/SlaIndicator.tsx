import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SlaIndicatorProps {
  firstResponse: string;
  triage: string;
  resolution: string;
}

const getTimeLeft = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: "Overdue", color: "text-destructive", status: "BREACHED" as const };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 1) return { text: `${days}d ${hours % 24}h`, color: "text-success", status: "OK" as const };
  return { text: `${hours}h`, color: "text-warning", status: "AT_RISK" as const };
};

export const SlaIndicator = ({ firstResponse, triage, resolution }: SlaIndicatorProps) => {
  const timers = [
    { label: "First Response", deadline: firstResponse },
    { label: "Triage", deadline: triage },
    { label: "Resolution", deadline: resolution },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SLA Timers</h4>
      {timers.map((t) => {
        const { text, color } = getTimeLeft(t.deadline);
        return (
          <Tooltip key={t.label}>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between text-sm cursor-default">
                <span className="text-muted-foreground">{t.label}</span>
                <span className={cn("flex items-center gap-1 font-mono text-xs font-medium", color)}>
                  <Clock className="h-3 w-3" /> {text}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Deadline: {new Date(t.deadline).toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
