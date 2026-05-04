import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, FolderOpen, FileText, DollarSign, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { User, Org, Program, Report, Payout } from "@/interfaces/Interfaces";

interface UserStatPoint {
  date: string;
  users: number;
}

interface RaportStatPoint {
  date: string;
  users: number;
}

interface DashboardStats {
  totalUsers: number;
  totalOrgs: number;
  totalPrograms: number;
  reportsThisWeek: number;
  payoutsThisMonth: number;
  activeSlabreaches: number;
  failedJobs: number;
  usersStats: UserStatPoint[];
  raportStats:RaportStatPoint[];
}

const INITIAL_STATS: DashboardStats = {
  totalUsers: 0,
  totalOrgs: 0,
  totalPrograms: 0,
  reportsThisWeek: 0,
  payoutsThisMonth: 0,
  activeSlabreaches: 0,
  failedJobs: 0,
  usersStats: [],
  raportStats:[]
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [
          usersResponse,
          orgsResponse,
          programsResponse,
          reportsThisWeek,
          payouts,
          usersStatsResponse,
          reportsStatsResponse,
          queuesData,
        ] = await Promise.all([
          api.get<{ items: User[] }>('/admin/users'),
          api.get<{ items: Org[] }>('/admin/organizations'),
          api.get<{ items: Program[] }>('/admin/programs'),
          api.get<{ items: Report[] }>('/reports/this-week'),
          api.get<{ items: Payout[] }>('/admin/payouts'),
          api.get<{ usersStats: Record<string, number> }>('/admin/usersStats'),
          api.get<{raportsStats : Record<string,number>}>('/admin/raportStats'),
          api.get<{ failed?: number }[]>('/admin/queues'),
        ]);

        const usersStats: UserStatPoint[] = Object.entries(
          usersStatsResponse.usersStats ?? {}
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, users]) => ({ date, users }));
          const raportStats: RaportStatPoint[] = Object.entries(
            reportsStatsResponse.raportsStats ?? {}
          )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, users]) => ({ date, users }));

        const failedJobs = Array.isArray(queuesData)
          ? queuesData.reduce((sum, q) => sum + (q.failed ?? 0), 0)
          : 0;

        setStats({
          totalUsers: usersResponse.items?.length ?? 0,
          totalOrgs: orgsResponse.items?.length ?? 0,
          totalPrograms: programsResponse.items?.length ?? 0,
          reportsThisWeek: reportsThisWeek.items?.length ?? 0,
          payoutsThisMonth: parseFloat(
            (payouts.items ?? [])
              .reduce((sum, p) => sum + p.amount, 0)
              .toFixed(3)
          ),
          activeSlabreaches: 0, // TODO: wire up real SLA breach endpoint
          failedJobs,
          usersStats,
          raportStats
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    { label: "Total Users",          value: stats.totalUsers.toLocaleString(),                       icon: Users,          color: "text-primary"     },
    { label: "Total Orgs",           value: stats.totalOrgs.toLocaleString(),                        icon: Building2,      color: "text-secondary"   },
    { label: "Total Programs",       value: stats.totalPrograms.toLocaleString(),                    icon: FolderOpen,     color: "text-success"     },
    { label: "Reports This Week",    value: stats.reportsThisWeek.toLocaleString(),                  icon: FileText,       color: "text-warning"     },
    { label: "Payouts This Month",   value: `$${(stats.payoutsThisMonth / 100).toLocaleString()}`,   icon: DollarSign,     color: "text-success"     },
    { label: "Active SLA Breaches",  value: stats.activeSlabreaches.toLocaleString(),                icon: AlertTriangle,  color: "text-destructive" },
  ];

  const hasAlerts = stats.failedJobs > 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Platform Stats</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">User Registrations (30d)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                {/* dataKey="users" matches the UserStatPoint shape */}
                <LineChart data={stats.usersStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="hsl(239,84%,67%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Report Volume (30d)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.raportStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System alerts */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">System Alerts</h3>
          <div className="space-y-3">
            {hasAlerts ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">{stats.failedJobs} failed jobs across queues</p>
                  <p className="text-xs text-muted-foreground">
                    Review and retry or discard failed jobs in the Queues page
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <p className="text-sm">No critical system alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;