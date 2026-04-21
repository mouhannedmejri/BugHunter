import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimeAgoProps {
  timestamp: string | Date;
  className?: string;
}

export const TimeAgo = ({ timestamp, className }: TimeAgoProps) => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = date.toLocaleString();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date.toISOString()} className={className}>
          {relative}
        </time>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
};
