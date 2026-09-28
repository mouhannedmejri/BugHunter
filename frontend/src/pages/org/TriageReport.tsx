import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusChanger } from "@/components/StatusChanger";
import { DuplicatePicker } from "@/components/DuplicatePicker";
import { SlaIndicator } from "@/components/SlaIndicator";
import { RewardModal } from "@/components/RewardModal";
import { MDEditor } from "@/components/MDEditor";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import type { ReportStatus, Severity } from "@/lib/mock-data";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { TimeAgo } from "@/components/TimeAgo";
import { StatusTimeline } from "@/components/StatusTimeline";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { Skeleton } from "@/components/ui/skeleton";
import { AiTriagePanel } from "@/components/AiTriagePanel";
import type { DetailedReport } from "@/lib/report-mock-data";

type OrgReportDetail = {
  id: string;
  title: string;
  programTitle: string;
  programSlug: string;
  severity: Severity;
  status: ReportStatus;
  category: string;
  affectedAsset: string;
  affectedAssetType: string;
  reproductionSteps: string;
  impact: string;
  remediation: string | undefined;
  environment: {
    os: string;
    browser: string;
  };
  createdAt: string;
  updatedAt: string;
  reward: number | undefined;
  submitter: {
    username: string;
    displayName: string | null;
    avatarUrl: string;
  };
  assignedReviewer: {
    username: string;
    displayName: string | null;
  } | undefined;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
    scanStatus: string;
  }>;
  comments: Array<{
    id: string;
    authorName: string;
    authorRole: string;
    body: string;
    createdAt: string;
    isInternal: boolean;
  }>;
  statusHistory: Array<{
    status: ReportStatus;
    changedAt: string;
    changedBy: string;
    note?: string
  }>;
  isOwnReport: boolean;
};

function farFutureIso() {
  return new Date(Date.now() + 365 * 86400000).toISOString();
}

function slaDue(records: OrgReportDetail["slaRecords"], key: string) {
  return records.find((s) => s.metricKey === key)?.dueAt ?? farFutureIso();
}

const TriageReport = () => {
  const { reportId, orgSlug } = useParams<{ reportId: string; orgSlug: string }>();
  const queryClient = useQueryClient();
  const [rewardOpen, setRewardOpen] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [publicComment, setPublicComment] = useState("");
  const [cvss, setCvss] = useState("");
  const [escalateReason, setEscalateReason] = useState("");

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["orgReport", orgSlug, reportId],
    queryFn: () => api.get<OrgReportDetail>(apiPaths.organizations.orgReport(orgSlug!, reportId!)),
    enabled: !!orgSlug && !!reportId,
  });

  const { data: members } = useQuery({
    queryKey: ["orgMembers", orgSlug],
    queryFn: () =>
      api.get<Array<{ userId: string; username: string; displayName?: string | null }>>(
        apiPaths.organizations.members(orgSlug!),
      ),
    enabled: !!orgSlug,
  });

  const invalidateReport = () => {
    void queryClient.invalidateQueries({ queryKey: ["orgReport", orgSlug, reportId] });
    void queryClient.invalidateQueries({ queryKey: ["triage", orgSlug] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: ReportStatus; reason?: string }) =>
      api.put(apiPaths.organizations.orgReportStatus(orgSlug!, reportId!), { status, reason }),
    onSuccess: () => {
      invalidateReport();
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      api.put(apiPaths.organizations.orgReportAssign(orgSlug!, reportId!), { assigneeId }),
    onSuccess: () => {
      toast.success("Assignee updated");
      invalidateReport();
    },
  });

  const severityMutation = useMutation({
    mutationFn: ({ severity, cvssScore }: { severity: Severity; cvssScore?: number }) =>
      api.put(apiPaths.organizations.orgReportSeverity(orgSlug!, reportId!), { severity, cvssScore }),
    onSuccess: () => {
      toast.success("Severity updated");
      invalidateReport();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (duplicateOfId: string) =>
      api.put(apiPaths.organizations.orgReportDuplicate(orgSlug!, reportId!), { duplicateOfId }),
    onSuccess: () => {
      toast.success("Marked as duplicate");
      invalidateReport();
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post(apiPaths.organizations.orgReportEscalate(orgSlug!, reportId!), { reason }),
    onSuccess: () => {
      toast.success("Escalated");
      setEscalateReason("");
      invalidateReport();
    },
  });

  const pushTicketMutation = useMutation({
    mutationFn: () => api.post(apiPaths.reports.pushTicket(reportId!), {}),
    onSuccess: () => toast.success("Ticket push queued"),
  });

  const postCommentMutation = useMutation({
    mutationFn: ({ body, isInternal }: { body: string; isInternal: boolean }) =>
      api.post(apiPaths.reports.comments(reportId!), { body, isInternal }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgReport", orgSlug, reportId] });
    },
  });

  const rewardDecisionMutation = useMutation({
    mutationFn: ({ amountCents, notes }: { amountCents: number; notes: string }) =>
      api.post(apiPaths.reports.reward(reportId!), {
        decision: "APPROVED",
        amountUsd: amountCents,
        bonusUsd: 0,
        reason: notes || undefined,
        overridePolicy: false,
      }),
    onSuccess: () => {
      invalidateReport();
    },
  });

  const searchDuplicateReports = useMemo(
    () => (q: string) =>
      api
        .get<{ items: Array<{ id: string; title: string }> }>(
          `${apiPaths.search.reports}?q=${encodeURIComponent(q)}&take=8`,
        )
        .then((res) => res.items ?? []),
    [],
  );

  const displaySeverity = (report?.severityValidated ?? report?.severityEstimate) as Severity | undefined;

  const policyRange = useMemo(() => {
    if (!report || !displaySeverity) return { min: 50_00, max: 500_00 };
    return { min: 50_00, max: 500_00 };
  }, [report, displaySeverity]);

  if (loadingReport || !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const shortId = `#${report.id.slice(0, 8).toUpperCase()}`;
  const submitterName = report.submitter.displayName ?? report.submitter.username;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/org/${orgSlug}/triage`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{shortId}</p>
          <h1 className="text-xl font-bold text-foreground">{report.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap gap-2">
            <SeverityBadge severity={displaySeverity ?? report.severityEstimate} />
            <StatusBadge status={report.status} />
          </div>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Reproduction Steps</h3>
              <MarkdownContent body={report.reproSteps || "_No steps provided._"} />
            </CardContent>
          </Card>

           <Card>
             <CardContent className="p-5">
               <h3 className="font-semibold mb-3">Impact</h3>
               <MarkdownContent body={report.impactExplanation || "_No impact description._"} />
             </CardContent>
           </Card>

           {/* Status Timeline */}
           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-sm">Status History</CardTitle>
             </CardHeader>
             <CardContent>
               <StatusTimeline history={report.statusHistory} />
             </CardContent>
           </Card>

           {/* Attachments */}
           <Card>
             <CardContent className="pt-6">
               <AttachmentGallery attachments={report.attachments} />
             </CardContent>
           </Card>

           <Tabs defaultValue="public">
            <TabsList>
              <TabsTrigger value="public">Public Comments</TabsTrigger>
              <TabsTrigger value="internal">Internal Notes</TabsTrigger>
            </TabsList>
             <TabsContent value="public" className="mt-4">
               <Card>
                 <CardContent className="p-5">
                   <div className="space-y-4">
                     {(report?.comments ?? [])
                       .filter((c) => !c.isInternal)
                       .map((c) => {
                         const authorName = c.author?.displayName ?? c.author?.username ?? c.authorName ?? "Unknown";
                         return (
                         <div key={c.id} className="flex gap-3">
                           <Avatar className="h-7 w-7">
                             <AvatarFallback className="text-xs bg-muted">
                               {authorName[0]}
                             </AvatarFallback>
                           </Avatar>
                           <div>
                             <p className="text-sm">
                               <span className="font-medium">{authorName}</span>{" "}
                               <span className="text-muted-foreground text-xs">
                                 <TimeAgo timestamp={c.createdAt} />
                               </span>
                             </p>
                             <div className="mt-1">
                               <MarkdownContent body={c.body} />
                             </div>
                           </div>
                         </div>
                         );
                       })}
                     {(report?.comments ?? []).filter((c) => !c.isInternal).length === 0 && (
                       <p className="text-sm text-muted-foreground">No public comments yet.</p>
                     )}
                   </div>
                 </CardContent>
               </Card>
               <MDEditor
                 value={publicComment}
                 onChange={setPublicComment}
                 placeholder="Add a public comment..."
                 minRows={3}
               />
               <Button
                 size="sm"
                 disabled={!publicComment.trim() || postCommentMutation.isPending}
                 onClick={() => {
                   postCommentMutation.mutate({ body: publicComment.trim(), isInternal: false });
                   setPublicComment("");
                 }}
               >
                 Add Comment
               </Button>
             </TabsContent>
            <TabsContent value="internal" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-5 space-y-3">
                  {(report?.comments ?? [])
                    .filter((c) => c.isInternal)
                    .map((c) => {
                      const authorName = c.author?.displayName ?? c.author?.username ?? c.authorName ?? "Unknown";
                      return (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {authorName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{authorName}</span>{" "}
                            <span className="text-muted-foreground text-xs">
                              <TimeAgo timestamp={c.createdAt} />
                            </span>
                          </p>
                          <div className="mt-1">
                            <MarkdownContent body={c.body} />
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  {(report?.comments ?? []).filter((c) => c.isInternal).length === 0 && (
                    <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                  )}
                </CardContent>
              </Card>
              <MDEditor
                value={internalNote}
                onChange={setInternalNote}
                placeholder="Add internal note..."
                minRows={3}
              />
              <Button
                size="sm"
                disabled={!internalNote.trim() || postCommentMutation.isPending}
                onClick={() => {
                  postCommentMutation.mutate({ body: internalNote.trim(), isInternal: true });
                  setInternalNote("");
                }}
              >
                Add Note
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <AiTriagePanel
            reportId={report.id}
            onApplySeverity={(suggestedSeverity, suggestedCvss) => {
              setCvss(suggestedCvss.toString());
              severityMutation.mutate({
                severity: suggestedSeverity,
                cvssScore: suggestedCvss,
              });
              toast.success(`Applied AI recommended ${suggestedSeverity} (CVSS ${suggestedCvss})`);
            }}
            onMarkDuplicate={(candidateId) => duplicateMutation.mutate(candidateId)}
          />

          <Card>

            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Program</p>
                  <p className="font-medium">{report.program.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{report.vulnCategory}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asset</p>
                  <p className="font-mono text-xs">{report.asset?.identifier ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitter</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-muted">{submitterName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{submitterName}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <SlaIndicator
                firstResponse={slaDue(report.slaRecords, "FIRST_RESPONSE")}
                triage={slaDue(report.slaRecords, "TRIAGE_DECISION")}
                resolution={slaDue(report.slaRecords, "FIX")}
              />

              <Separator />

              <StatusChanger
                currentStatus={report.status}
                onChanged={(s, reason) => statusMutation.mutate({ status: s, reason })}
              />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Severity override
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={displaySeverity}
                    onValueChange={(v) =>
                      severityMutation.mutate({
                        severity: v as Severity,
                        cvssScore: cvss ? Number(cvss) : undefined,
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm flex-1 min-w-[140px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] as Severity[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={cvss}
                    onChange={(e) => setCvss(e.target.value)}
                    placeholder="CVSS"
                    className="h-9 w-24 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign to</label>
                <Select
                  value={report.assignee?.id ?? "__none__"}
                  onValueChange={(v) => v !== "__none__" && assignMutation.mutate(v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName || m.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DuplicatePicker
                currentReportId={report.id}
                fetchMatches={searchDuplicateReports}
                onSelect={(id) => duplicateMutation.mutate(id)}
              />

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalate</label>
                <Input
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Reason (required)"
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  disabled={!escalateReason.trim() || escalateMutation.isPending}
                  onClick={() => escalateMutation.mutate(escalateReason.trim())}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRewardOpen(true)}>
                  <DollarSign className="h-3.5 w-3.5" /> Reward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 col-span-2"
                  disabled={pushTicketMutation.isPending}
                  onClick={() => pushTicketMutation.mutate()}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Push to Jira/Linear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RewardModal
        open={rewardOpen}
        onOpenChange={setRewardOpen}
        reportTitle={report.title}
        severity={displaySeverity ?? report.severityEstimate}
        suggestedMin={policyRange.min}
        suggestedMax={policyRange.max}
        onSubmit={(amtCents, notes) => {
          if (!report.severityValidated) {
            toast.error("Set validated severity before creating a reward");
            return;
          }
          rewardDecisionMutation.mutate({ amountCents: amtCents, notes });
        }}
      />
    </div>
  );
};

export default TriageReport;
