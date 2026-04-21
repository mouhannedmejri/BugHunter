import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Shield, FileText, Clock, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { useParams } from "react-router-dom";
import { formatCurrency } from "@/lib/mock-data";
import { format } from "date-fns";

const COLORS = ["hsl(239,84%,67%)", "hsl(199,89%,48%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(142,71%,45%)", "hsl(220,10%,60%)"];

type Overview = {
  totalReports?: number;
  acceptRate?: number;
  medianTriageHours?: number;
  totalPaidUsd?: number;
  openHighSeverity?: number;
};

type TrendRow = { day: string; count: number };
type CategoryRow = { vulnCategory: string; _count: { id: number } };
type AssetRow = { identifier: string; count: number };
type ResearcherRow = { userId: string; username: string; count: number };
type SlaSummary = { total: number; compliant: number; complianceRate: number };

const OrgAnalytics = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [period, setPeriod] = useState("7d");

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["orgAnalyticsOverview", orgSlug],
    queryFn: () => api.get<Overview>(apiPaths.organizations.analytics(orgSlug!, "overview")),
    enabled: !!orgSlug,
  });

  const { data: trendsRaw = [] } = useQuery({
    queryKey: ["orgAnalyticsTrends", orgSlug, period],
    queryFn: () =>
      api.get<TrendRow[]>(`${apiPaths.organizations.analytics(orgSlug!, "trends")}?period=${period}`),
    enabled: !!orgSlug,
  });

  const { data: sla } = useQuery({
    queryKey: ["orgAnalyticsSla", orgSlug],
    queryFn: () => api.get<SlaSummary>(apiPaths.organizations.analytics(orgSlug!, "sla")),
    enabled: !!orgSlug,
  });

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ["orgAnalyticsCategories", orgSlug],
    queryFn: () => api.get<CategoryRow[]>(apiPaths.organizations.analytics(orgSlug!, "categories")),
    enabled: !!orgSlug,
  });

  const { data: assetsRaw = [] } = useQuery({
    queryKey: ["orgAnalyticsAssets", orgSlug],
    queryFn: () => api.get<AssetRow[]>(apiPaths.organizations.analytics(orgSlug!, "assets")),
    enabled: !!orgSlug,
  });

  const { data: researchersRaw = [] } = useQuery({
    queryKey: ["orgAnalyticsResearchers", orgSlug],
    queryFn: () => api.get<ResearcherRow[]>(apiPaths.organizations.analytics(orgSlug!, "researchers")),
    enabled: !!orgSlug,
  });

  const trendsData = useMemo(
    () =>
      trendsRaw.map((row) => ({
        date: format(new Date(row.day), "MMM d"),
        submitted: row.count,
      })),
    [trendsRaw],
  );

  const categoryData = useMemo(
    () =>
      categoriesRaw.map((row) => ({
        name: row.vulnCategory,
        value: row._count.id,
      })),
    [categoriesRaw],
  );

  const assetData = useMemo(
    () =>
      assetsRaw.map((row) => ({
        asset: row.identifier,
        reports: row.count,
      })),
    [assetsRaw],
  );

  const statCards = [
    { label: "Total Reports", value: overview?.totalReports ?? "—", icon: FileText, color: "text-primary" },
    {
      label: "Accept rate",
      value:
        overview?.acceptRate != null ? `${Math.round(overview.acceptRate * 100)}%` : "—",
      icon: Shield,
      color: "text-success",
    },
    {
      label: "Median triage",
      value:
        overview?.medianTriageHours != null && overview.medianTriageHours > 0
          ? `${Math.round(overview.medianTriageHours)}h`
          : "—",
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Total paid",
      value:
        overview?.totalPaidUsd != null
          ? formatCurrency(Math.round(overview.totalPaidUsd * 100))
          : "—",
      icon: DollarSign,
      color: "text-secondary",
    },
    {
      label: "Open high/critical",
      value: overview?.openHighSeverity ?? "—",
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  if (loadingOverview) {
    return (
      <div className="flex h-full items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast.info(`Export: GET ${apiPaths.organizations.analytics(orgSlug!, "export")}`)
            }
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="researchers">Researchers</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Report volume (submitted)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="submitted" stroke="hsl(239,84%,67%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Report trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="submitted" stroke="hsl(239,84%,67%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="font-semibold">SLA summary</h3>
              <p className="text-sm text-muted-foreground">
                Total SLA records: {sla?.total ?? 0}, completed compliant: {sla?.compliant ?? 0}
              </p>
              <Badge variant="secondary" className="text-xs">
                Compliance rate:{" "}
                {sla?.complianceRate != null ? `${Math.round(sla.complianceRate * 100)}%` : "—"}
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="researchers" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Top researchers (submissions)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Researcher</TableHead>
                    <TableHead className="text-right">Reports</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchersRaw.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground text-sm">
                        No data yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    researchersRaw.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className="font-medium">@{r.username}</TableCell>
                        <TableCell className="text-right font-mono">{r.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Assets with most reports</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" />
                    <YAxis dataKey="asset" type="category" width={150} className="text-xs" />
                    <RechartsTooltip />
                    <Bar dataKey="reports" fill="hsl(239,84%,67%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">Vulnerability categories</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrgAnalytics;
