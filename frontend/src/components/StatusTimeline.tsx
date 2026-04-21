import { StatusBadge } from "@/components/StatusBadge";
import type { StatusHistoryEntry } from "@/lib/report-mock-data";
import { format } from "date-fns";

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

export const StatusTimeline = ({ history }: StatusTimelineProps) => {
  return (
    <div className="relative space-y-0">
      {history.map((entry, i) => (
        <div key={i} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background" />
            {i < history.length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
          </div>
          <div className="flex-1 -mt-0.5 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={entry.status} />
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.changedAt), "MMM d, yyyy HH:mm")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              by {entry.changedBy}
              {entry.note && <span className="text-foreground"> — {entry.note}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
