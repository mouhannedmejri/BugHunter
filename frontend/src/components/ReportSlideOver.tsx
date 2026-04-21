import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusChanger } from "@/components/StatusChanger";
import { DuplicatePicker } from "@/components/DuplicatePicker";
import { SlaIndicator } from "@/components/SlaIndicator";
import { RewardModal } from "@/components/RewardModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, ExternalLink, DollarSign, AlertTriangle } from "lucide-react";
import type { ReportStatus, Severity } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/** Minimal report shape for the triage slide-over (API row or mapped view model). */
export type ReportSlideOverReport = {
  id: string;
  shortId: string;
  title: string;
  severity: Severity;
  status: ReportStatus;
  programTitle: string;
  programSlug?: string;
  vulnCategory?: string;
  asset?: string;
  createdAt: string;
  submitter: { name: string; username: string };
  assignee?: { name: string; username?: string };
  slaFirstResponse: string;
  slaTriage: string;
  slaResolution: string;
};

interface ReportSlideOverProps {
  report: ReportSlideOverReport | null;
  orgSlug?: string;
  open: boolean;
  onClose: () => void;
}

export const ReportSlideOver = ({ report, orgSlug, open, onClose }: ReportSlideOverProps) => {
  const [rewardOpen, setRewardOpen] = useState(false);

  if (!report) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-1">{report.shortId}</div>
                <SheetTitle className="text-lg leading-snug">{report.title}</SheetTitle>
              </SheetHeader>

              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={report.severity} />
                <StatusBadge status={report.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Program</p>
                  <p className="font-medium">{report.programTitle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Category</p>
                  <p className="font-medium">{report.vulnCategory || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Asset</p>
                  <p className="font-mono text-xs">{report.asset || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Submitted</p>
                  <p className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitter</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-muted">{report.submitter.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{report.submitter.name}</p>
                    <p className="text-xs text-muted-foreground">@{report.submitter.username}</p>
                  </div>
                </div>
              </div>

              {report.assignee && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{report.assignee.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{report.assignee.name}</p>
                  </div>
                </div>
              )}

              <Separator />

              <SlaIndicator
                firstResponse={report.slaFirstResponse}
                triage={report.slaTriage}
                resolution={report.slaResolution}
              />

              <Separator />

              <StatusChanger
                currentStatus={report.status}
                onChanged={(status: ReportStatus) => toast.info(`Would update to ${status}`)}
              />

              <DuplicatePicker currentReportId={report.id} onSelect={(id) => toast.info(`Would link duplicate: ${id}`)} />

              <Separator />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRewardOpen(true)}>
                    <DollarSign className="h-3.5 w-3.5" /> Create Reward
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Escalation modal")}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <Link to={`/org/${orgSlug ?? "_"}/triage/${report.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" /> Full View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Would assign")}>
                    <User className="h-3.5 w-3.5" /> Assign
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <RewardModal
        open={rewardOpen}
        onOpenChange={setRewardOpen}
        reportTitle={report.title}
        severity={report.severity}
        suggestedMin={200000}
        suggestedMax={500000}
        onSubmit={(amt, notes) => toast.success(`Reward created: $${amt / 100}`)}
      />
    </>
  );
};
