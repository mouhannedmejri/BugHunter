import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle2,
  Star,
  DollarSign,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Users,
} from 'lucide-react';
import { SeverityBadge } from '@/components/SeverityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { ReputationTrend } from '@/components/ReputationTrend';
import { ProgramCard } from '@/components/ProgramCard';
import { api, apiPaths } from '@/lib/api';
import { formatCurrency } from '@/lib/mock-data';
import { format } from 'date-fns';
import type { Report, Program, UserAnalytics, UserProfile } from '@/interfaces/Interfaces';

/**
 * UserDashboard - Complete dashboard data shape for researcher home
 * Combines profile, analytics, recent activity, and derived metrics
 */
type UserDashboard = {
  profile: UserProfile;
  analytics: UserAnalytics;
  recentReports: Report[];
  activePrograms: Program[];
  stats: {
    totalSubmitted: number;
    totalAccepted: number;
    totalEarned: number;
    acceptanceRate: number;
    rank: number;
    streakDays: number;
    avgResolutionTime: number;
    pendingSLA: number;
  };
  performanceBySeverity: Array<{
    severity: string;
    submitted: number;
    accepted: number;
    rate: number;
  }>;
};

type MeApiResponse = UserProfile & { profile?: UserProfile };
type AnalyticsApiResponse = Omit<UserAnalytics, 'trend'> & {
  trend?: Array<{ day: string | Date; count?: number; points?: number }>;
};

// ── Helper Functions ─────────────────────────────────────────────────────────

const AWAITING_STATUSES = ['NEW', 'TRIAGING', 'PENDING'] as const;

/**
 * Fetches complete dashboard data for the current user
 */
async function fetchDashboardData(): Promise<UserDashboard> {
  const [meRes, analyticsRes, reportsData, programsData] = await Promise.all([
    api.get<MeApiResponse>(apiPaths.users.me),
    api.get<AnalyticsApiResponse>(apiPaths.users.meAnalytics),
    api.get<{ items: Report[]; total: number }>(apiPaths.reports.me),
    api.get<{ items: Program[]; total: number }>(
      `${apiPaths.programs.root}?status=ACTIVE&page=1&limit=6`,
    ),
  ]);

  const profile = meRes.profile ?? meRes;

  const rawTrend = analyticsRes.trend ?? [];
  const analytics: UserAnalytics = {
    ...analyticsRes,
    trend: rawTrend.map((row) => ({
      day: typeof row.day === 'string' ? row.day : new Date(row.day).toISOString().slice(0, 10),
      points: row.points ?? row.count ?? 0,
    })),
  };

  const reports = (reportsData.items ?? []) as Report[];
  const programsList = Array.isArray(programsData)
    ? programsData
    : Array.isArray(programsData.items)
      ? programsData.items
      : [];
  const activePrograms = programsList.filter((p) => p.status === 'ACTIVE').slice(0, 3);

  // Calculate derived stats
  const totalSubmitted = reports.length;
  const totalAccepted = reports.filter((r) => r.status === 'ACCEPTED').length;
  const totalEarned = reports.reduce((sum, r) => sum + (r.reward ?? 0), 0);
  const acceptanceRate = totalSubmitted > 0 ? (totalAccepted / totalSubmitted) * 100 : 0;

  // Severity breakdown
  const severityMap = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;
  const performanceBySeverity = severityMap.map((sev) => {
    const submitted = reports.filter((r) => r.severity === sev).length;
    const accepted = reports.filter((r) => r.severity === sev && r.status === 'ACCEPTED').length;
    return {
      severity: sev,
      submitted,
      accepted,
      rate: submitted > 0 ? (accepted / submitted) * 100 : 0,
    };
  });

  // Streak calculation (simplified - based on recent submissions)
  const recentDates = reports
    .map((r) => new Date(r.createdAt).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  let streakDays = 1;
  for (let i = recentDates.length - 1; i > 0; i--) {
    const diff = Math.abs(
      new Date(recentDates[i]).getTime() - new Date(recentDates[i - 1]).getTime(),
    );
    const dayDiff = diff / (1000 * 60 * 60 * 24);
    if (dayDiff <= 1) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    profile,
    analytics,
    recentReports: reports.slice(0, 7),
    activePrograms,
    stats: {
      totalSubmitted,
      totalAccepted,
      totalEarned,
      acceptanceRate,
      rank: analytics.rank,
      streakDays,
      avgResolutionTime: 48, // placeholder - would need resolution dates
      pendingSLA: reports.filter((r) => AWAITING_STATUSES.includes(r.status)).length,
    },
    performanceBySeverity,
  };
}

// ── Dashboard Page Component ─────────────────────────────────────────────────

const ResearcherDashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load dashboard</h3>
        <p className="text-muted-foreground mb-4">Could not fetch your dashboard data.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  const loadingStats = isLoading || !data;
  const profile = data?.profile;
  const analytics = data?.analytics;
  const stats = data?.stats;
  const performanceBySeverity = data?.performanceBySeverity ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard — BugHuntr
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back,{' '}
              {loadingStats ? (
                <Skeleton className="h-5 w-32 inline-block" />
              ) : (
                <span className="font-medium text-foreground">
                  {profile?.displayName ?? profile?.username ?? 'researcher'}
                </span>
              )}
              !
            </p>
            {profile && (
              <p className="text-sm text-muted-foreground">
                Member since {format(new Date(profile.createdAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section 1: Quick Stats Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quick Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingStats
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-14" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              : [
                  {
                    label: 'Total Submitted',
                    value: stats?.totalSubmitted.toLocaleString() ?? '0',
                    icon: FileText,
                    color: 'text-secondary',
                    bg: 'bg-secondary/10',
                  },
                  {
                    label: 'Accepted',
                    value: stats?.totalAccepted.toLocaleString() ?? '0',
                    icon: CheckCircle2,
                    color: 'text-green-600',
                    bg: 'bg-green-100',
                  },
                  {
                    label: 'Global Rank',
                    value: stats?.rank ? `#${stats.rank.toLocaleString()}` : '—',
                    icon: Star,
                    color: 'text-primary',
                    bg: 'bg-primary/10',
                  },
                  {
                    label: 'Earned',
                    value: formatCurrency(stats?.totalEarned ?? 0),
                    icon: DollarSign,
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-100',
                  },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                      >
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
        </section>

        {/* Section 2: Performance by Severity */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance by Severity
          </h2>
          <Card>
            <CardContent className="p-6">
              {loadingStats ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-24 rounded" />
                      <Skeleton className="h-2 flex-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceBySeverity.map((item) => (
                    <div key={item.severity} className="flex items-center gap-3">
                      <div className="w-24">
                        <SeverityBadge severity={item.severity} />
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={item.submitted > 0 ? (item.accepted / item.submitted) * 100 : 0}
                          className="h-2"
                          indicatorClassName={
                            item.rate >= 70
                              ? 'bg-green-500'
                              : item.rate >= 50
                                ? 'bg-yellow-500'
                                : 'bg-destructive'
                          }
                        />
                      </div>
                      <div className="w-20 text-sm text-muted-foreground">
                        {item.rate.toFixed(1)}% ({item.accepted}/{item.submitted})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Reputation Trend & Analytics */}
        <section className="mb-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Reputation Trend</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">Last 30 days</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="h-48 flex items-center justify-center">
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : (
                    <ReputationTrend trend={analytics?.trend || []} />
                  )}
                  {loadingStats ? (
                    <div className="mt-4 flex items-center justify-between">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Current reputation points</p>
                      <p className="text-lg font-bold text-primary">
                        {analytics?.rank ? `Rank #${analytics.rank.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Awaiting Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingStats ? (
                  <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : stats?.pendingSLA === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reports awaiting response
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{stats?.pendingSLA} reports pending</p>
                        <p className="text-xs text-muted-foreground">SLA: within 48h</p>
                      </div>
                      <Badge variant="warning">Active</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Recent Reports */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Reports
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              View all
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingStats ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.recentReports.length === 0 ? (
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
                      {data?.recentReports.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/reports/${r.id}`)}
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
                            {format(new Date(r.createdAt), 'MMM d')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 5: Active Programs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Active Programs
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/programs')}>
              View all
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              {loadingStats ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full rounded-xl" />
                  ))}
                </div>
              ) : data?.activePrograms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No active programs at the moment. Find a program to start hunting!
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.activePrograms.map((p) => (
                    <ProgramCard key={p.id} program={p} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default ResearcherDashboard;
