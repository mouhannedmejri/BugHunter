import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Clock, DollarSign, Plus, UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatCurrency } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";

const actionLabel: Record<string, string> = {
  REPORT_STATUS_CHANGED: "Report status updated",
  ORG_MEMBER_ADDED: "Member joined organization",
  ORG_MEMBER_REMOVED: "Member removed",
  ORG_INVITE_SENT: "New member invited",
  ORG_INVITE_REVOKED: "Invite revoked",
  ORG_MEMBER_ROLE_CHANGED: "Role permissions changed",
  ORG_UPDATED: "Organization profile updated",
  PROGRAM_CREATED: "Program published",
  PROGRAM_UPDATED: "Program settings updated",
};

type OrgProgramRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
};

type AuditRow = {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
};

type OverviewStats = {
  totalReports?: number;
  openHighSeverity?: number;
  medianTriageHours?: number;
  totalPaidUsd?: number;
};

const OrgOverview = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["orgAnalyticsOverview", orgSlug],
    queryFn: () => api.get<OverviewStats>(apiPaths.organizations.analytics(orgSlug!, "overview")),
    enabled: !!orgSlug,
  });

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["orgPrograms", orgSlug],
    queryFn: () => api.get<OrgProgramRow[]>(apiPaths.organizations.programs(orgSlug!)),
    enabled: !!orgSlug,
  });

  const { data: auditLogs = [], isLoading: loadingAuditLogs } = useQuery({
    queryKey: ["orgAuditLogs", orgSlug],
    queryFn: () =>
      api.get<AuditRow[]>(`${apiPaths.organizations.auditLogs(orgSlug!)}?limit=8`),
    enabled: !!orgSlug,
  });

  if (loadingOverview || loadingPrograms || loadingAuditLogs) {
    return (
      <div className="flex h-full items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeProgramsCount = programs.filter((p) => p.status === "ACTIVE").length;
  const paidCents = Math.round((overview?.totalPaidUsd ?? 0) * 100);

  const stats = [
    { label: "Active Programs", value: String(activeProgramsCount), icon: Shield, color: "text-primary" },
    {
      label: "Open High / Critical",
      value: String(overview?.openHighSeverity ?? 0),
      icon: FileText,
      color: "text-warning",
    },
    {
      label: "Med. Triage Time",
      value:
        overview?.medianTriageHours != null && overview.medianTriageHours > 0
          ? `${Math.round(overview.medianTriageHours)}h`
          : "—",
      icon: Clock,
      color: "text-success",
    },
    {
      label: "Total Paid Out",
      value: formatCurrency(paidCents),
      icon: DollarSign,
      color: "text-secondary",
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organization Overview</h1>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" asChild>
            <Link to={`/org/${orgSlug}/programs/new`}>
              <Plus className="h-3.5 w-3.5" /> Create Program
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to={`/org/${orgSlug}/members`}>
              <UserPlus className="h-3.5 w-3.5" /> Invite Member
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Activity</h2>
              <Badge variant="secondary" className="text-xs">
                {auditLogs.length} events
              </Badge>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent organization activity.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{item.actor}</span>{" "}
                        <span className="text-muted-foreground">
                          {actionLabel[item.action] ?? item.action.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.target}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Programs</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/org/${orgSlug}/programs`} className="gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                You haven&apos;t launched any hunting programs yet.
              </div>
            ) : (
              <div className="space-y-3">
                {programs.map((p) => (
                  <Link
                    key={p.id}
                    to={`/org/${orgSlug}/programs/${p.slug}/settings`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{p.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {p.type}
                        </Badge>
                        <Badge
                          variant={
                            p.status === "ACTIVE"
                              ? "default"
                              : p.status === "PAUSED"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-mono text-xs opacity-70">Manage</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrgOverview;
