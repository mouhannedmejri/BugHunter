import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export const BadgeShowcase = ({ badges }: { badges: BadgeItem[] }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
    {badges.map((b) => (
      <Tooltip key={b.id}>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-default">
            <span className="text-2xl">{b.icon}</span>
            <span className="text-xs font-medium text-foreground text-center leading-tight">{b.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{b.name}</p>
          <p className="text-xs text-muted-foreground">{b.description}</p>
          <p className="text-xs text-muted-foreground mt-1">Earned {new Date(b.earnedAt).toLocaleDateString()}</p>
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
);
