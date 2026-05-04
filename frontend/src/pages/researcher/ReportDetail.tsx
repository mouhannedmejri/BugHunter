import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SlaTimers } from "@/components/SlaTimers";
import { Skeleton } from "@/components/ui/skeleton";
import { vulnerabilityCategories } from "@/lib/report-mock-data";
import type { DetailedReport } from "@/lib/report-mock-data";
import { formatCurrency } from "@/lib/mock-data";
import { api, apiPaths } from "@/lib/api";
import { ArrowLeft, Edit, ExternalLink } from "lucide-react";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get<DetailedReport>(apiPaths.reports.byId(id))
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton className="h-10 w-32 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate("/reports")}>Back to Reports</Button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const categoryLabel =
    vulnerabilityCategories.find((c) => c.value === report.category)?.label ??
    report.category;

  return (
    <div className="p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4 text-muted-foreground" onClick={() => navigate("/reports")}>
        <ArrowLeft className="h-4 w-4" /> My Reports
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-foreground">{report.title}</h1>
              {report.isOwnReport && report.status === "DRAFT" && (
                <Button variant="outline" size="sm" className="gap-1 shrink-0">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={report.severity} />
              <StatusBadge status={report.status} />
              <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
            </div>
          </div>

          {/* Status Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline history={report.statusHistory} />
            </CardContent>
          </Card>

          {/* Reproduction Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reproduction Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownContent body={report.reproductionSteps} />
            </CardContent>
          </Card>

          {/* Impact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownContent body={report.impact} />
            </CardContent>
          </Card>

          {/* Remediation */}
          {report.remediation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Suggested Remediation</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent body={report.remediation} />
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card>
            <CardContent className="pt-6">
              <AttachmentGallery attachments={report.attachments} />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardContent className="pt-6">
              <CommentThread comments={report.comments} isOrgMember={false} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Program */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Program</h4>
              <Link to={`/programs/${report.programSlug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                {report.programTitle} <ExternalLink className="h-3 w-3" />
              </Link>

              <Separator />

              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Affected Asset</h4>
              <div className="text-sm">
                <span className="text-xs text-muted-foreground font-mono">[{report.affectedAssetType}]</span>{" "}
                <span className="font-medium text-foreground">{report.affectedAsset}</span>
              </div>

              <Separator />

              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitter</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {report.submitter.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{report.submitter.displayName}</span>
                <span className="text-xs text-muted-foreground">@{report.submitter.username}</span>
              </div>

              {report.assignedReviewer && (
                <>
                  <Separator />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reviewer</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {report.assignedReviewer.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{report.assignedReviewer.displayName}</span>
                  </div>
                </>
              )}

              {report.reward && (
                <>
                  <Separator />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reward</h4>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(report.reward)}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* SLA Timers — visible to org members */}
          <Card>
            <CardContent className="pt-6">
              <SlaTimers
                timers={[
                  { label: "First Response", deadline: "2026-04-07T10:00:00Z" },
                  { label: "Triage Decision", deadline: "2026-04-09T10:00:00Z" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">OS:</span> {report.environment.os}</p>
                <p><span className="text-muted-foreground">Browser:</span> {report.environment.browser}</p>
              </div>
            </CardContent>
          </Card>

          {/* Researcher action */}
          {report.isOwnReport && report.status === "DRAFT" && (
            <Button variant="destructive" className="w-full">Withdraw Report</Button>
          )}
        </div>
      </div>
    </div>
  );
}
