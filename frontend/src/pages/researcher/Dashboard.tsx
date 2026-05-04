import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2, Star, DollarSign, Clock } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ReputationTrend } from "@/components/ReputationTrend";
import { ProgramCard } from "@/components/ProgramCard";
import { api, apiPaths } from "@/lib/api";
import { mapProgram } from "@/lib/backend-bridge";
import { formatCurrency } from "@/lib/mock-data";
import { format } from "date-fns";
import type { Report, Program, UserAnalytics, UserProfile } from "@/interfaces/Interfaces";

type MeApiResponse = UserProfile & { profile?: UserProfile };

type AnalyticsApiResponse = Omit<UserAnalytics, "trend"> & {
  trend?: Array<{ day: string | Date; count?: number; points?: number }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
 
/** Reports that are still waiting on a triage response */
const AWAITING_STATUSES = ["NEW", "TRIAGING", "PENDING"];
 
// ── Component ────────────────────────────────────────────────────────────────
 
const Dashboard = () => {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [meRes, analyticsRes, reportsData, programsData] = await Promise.all([
          api.get<MeApiResponse>(apiPaths.users.me),
          api.get<AnalyticsApiResponse>(apiPaths.users.meAnalytics),
          api.get<{ items: Report[]; total: number }>(
            `${apiPaths.reports.me}`,
          ),
          api.get<{ items: Program[]; total: number }>(
            `${apiPaths.programs.root}?status=ACTIVE&page=1&limit=6`,
          ),
        ]);

        setMe(meRes.profile ?? meRes);

        const rawTrend = analyticsRes.trend ?? [];
        setAnalytics({
          ...analyticsRes,
          trend: rawTrend.map((row) => ({
            day: typeof row.day === 'string' ? row.day : new Date(row.day).toISOString().slice(0, 10),
            points: row.points ?? row.count ?? 0,
          })),
        });
        setReports(reportsData.items ?? (reportsData as unknown as Report[]));
        const rawPrograms = Array.isArray(programsData)
          ? programsData
          : programsData.items ?? [];
        setPrograms(
          rawPrograms
            .map((p) => mapProgram((p as Record<string, unknown>) ?? {}))
            .filter((p) => p.status === "ACTIVE"),
        );
      } catch {
        
      } finally {
        setLoading(false);
      }
    };
 
    fetchAll();
  }, []);
 
  // Derived
  const pendingSLA = reports.filter((r) => AWAITING_STATUSES.includes(r.status));
 
  const statCards = analytics
    ? [
        {
          label: "Total Submitted",
          value: analytics.submissions.toLocaleString(),
          icon: FileText,
          color: "text-secondary",
        },
        {
          label: "Accepted",
          value: analytics.accepted.toLocaleString(),
          icon: CheckCircle2,
          color: "text-green-600",
        },
        {
          label: "Global Rank",
          value: analytics.rank ? `#${analytics.rank.toLocaleString()}` : "—",
          icon: Star,
          color: "text-primary",
        },
        {
          label: "Avg. Reward",
          value: formatCurrency(analytics.avgReward),
          icon: DollarSign,
          color: "text-yellow-600",
        },
      ]
    : [];
 
  // ── Render ──────────────────────────────────────────────────────────────────
 
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          Welcome back,{" "}
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span>{me?.username ?? me?.displayName ?? "researcher"}</span>
          )}
        </div>
      </div>
 
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
 
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Recent Reports</CardTitle>
              <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No reports yet. Find a program and start hunting!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden sm:table-cell">Program</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.slice(0, 7).map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          // navigate to report detail if needed
                        }}
                      >
                        <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                          {r.title}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {r.programTitle}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={r.severity} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {format(new Date(r.createdAt), "MMM d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
 
        {/* Right column */}
        <div className="space-y-6">
          {/* Reputation Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reputation Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardHeader>
            <CardContent>
              <ReputationTrend trend={analytics?.trend || []} />
              {loading ? (
                <Skeleton className="mx-auto mt-2 h-6 w-24" />
              ) : (
                <p className="mt-2 text-center text-lg font-bold text-primary">
                  {analytics?.rank ? `Rank #${analytics.rank.toLocaleString()}` : "—"}
                </p>
              )}
            </CardContent>
          </Card>
 
          {/* Awaiting Response / SLA */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Awaiting Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : pendingSLA.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reports awaiting response
                </p>
              ) : (
                pendingSLA.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.programTitle}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
 
      {/* Active Programs */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Active Programs</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active programs at the moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.slice(0, 3).map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
 
export default Dashboard;