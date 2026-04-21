import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlaTimer {
  label: string;
  deadline: string;
}

interface SlaTimersProps {
  timers: SlaTimer[];
}

const getTimeLeft = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: "Overdue", urgent: true };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return { text: `${days}d ${hours % 24}h`, urgent: days < 2 };
  return { text: `${hours}h`, urgent: hours < 12 };
};

export const SlaTimers = ({ timers }: SlaTimersProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SLA Timers</h4>
      {timers.map((timer) => {
        const { text, urgent } = getTimeLeft(timer.deadline);
        return (
          <div key={timer.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{timer.label}</span>
            <span className={cn("flex items-center gap-1 font-mono text-xs font-medium", urgent ? "text-destructive" : "text-foreground")}>
              <Clock className="h-3 w-3" /> {text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
