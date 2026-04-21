import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, FolderOpen, FileText, DollarSign, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrgs: 0,
    totalPrograms: 0,
    reportsThisWeek: 0,
    payoutsThisMonth: 0,
    activeSlabreaches: 0,
    failedJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats on component mount
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [usersResponse, orgsResponse, programsResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/organizations'),
          api.get('/admin/programs'),
        ]);
        
        const usersData = Array.isArray(usersResponse) ? usersResponse : [];
        const orgsData = Array.isArray(orgsResponse) ? orgsResponse : [];
        const programsData = Array.isArray(programsResponse) ? programsResponse : [];
        
        // Calculate reports this week (simplified)
        const reportsThisWeek = Math.floor(Math.random() * 50) + 10; // Placeholder - would need real reports API
        
        // Calculate payouts this month (simplified) 
        const payoutsThisMonth = Math.floor(Math.random() * 50000) + 33000; // Placeholder - would need real payouts API
        
        // Get queue data for failed jobs
        const queuesData = await api.get('/admin/queues');
        const failedJobs = Array.isArray(queuesData) 
          ? queuesData.reduce((sum: number, q: any) => sum + (q.failed || 0), 0)
          : 0;

        setStats({
          totalUsers: usersData.length,
          totalOrgs: orgsData.length,
          totalPrograms: programsData.length,
          reportsThisWeek,
          payoutsThisMonth,
          activeSlabreaches: 3, // Placeholder - would need real SLA API
          failedJobs,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Platform Stats</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[/*stats.map((s) => (*/
          { label: "Total Users", value: stats.totalUsers.toString(), icon: Users, color: "text-primary" },
          { label: "Total Orgs", value: stats.totalOrgs.toString(), icon: Building2, color: "text-secondary" },
          { label: "Total Programs", value: stats.totalPrograms.toString(), icon: FolderOpen, color: "text-success" },
          { label: "Reports This Week", value: stats.reportsThisWeek.toString(), icon: FileText, color: "text-warning" },
          { label: "Payouts This Month", value: `$${(stats.payoutsThisMonth / 100).toLocaleString()}`, icon: DollarSign, color: "text-success" },
          { label: "Active SLA Breaches", value: stats.activeSlabreaches.toString(), icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">User Registrations (30d)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.from({ length: 30 }, (_, i) => ({
                  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  users: Math.floor(Math.random() * 20) + 5,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
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
                <LineChart data={Array.from({ length: 30 }, (_, i) => ({
                  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  reports: Math.floor(Math.random() * 15) + 3,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">System Alerts</h3>
          <div className="space-y-3">
            {stats.failedJobs > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">{stats.failedJobs} failed jobs across queues</p>
                  <p className="text-xs text-muted-foreground">Review and retry or discard failed jobs in the Queues page</p>
                </div>
              </div>
            )}
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">No critical system alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
