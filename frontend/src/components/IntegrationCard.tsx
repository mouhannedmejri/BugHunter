import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, CheckCircle2, Circle } from "lucide-react";
import type { Integration } from "@/lib/org-mock-data";

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: () => void;
}

export const IntegrationCard = ({ integration, onConfigure }: IntegrationCardProps) => {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{integration.icon}</span>
            <div>
              <h3 className="font-semibold text-foreground">{integration.name}</h3>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
          <Badge
            variant={integration.connected ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {integration.connected ? (
              <><CheckCircle2 className="h-3 w-3" /> Connected</>
            ) : (
              <><Circle className="h-3 w-3" /> Disconnected</>
            )}
          </Badge>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onConfigure} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            {integration.connected ? "Configure" : "Connect"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
