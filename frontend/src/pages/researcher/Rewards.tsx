import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/SeverityBadge";
import { DollarSign, TrendingUp, Clock, ExternalLink, Download } from "lucide-react";
import { formatCurrency, type Severity } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";

type RewardStatus = "PENDING_APPROVAL" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface Reward {
  id: string;
  reportTitle: string;
  program: string;
  severity: Severity;
  amount: number;
  status: RewardStatus;
  date: string;
}

const mockRewards: Reward[] = [
  { id: "rw1", reportTitle: "Stored XSS in profile bio field", program: "Acme Corp", severity: "HIGH", amount: 250000, status: "COMPLETED", date: "2026-04-02" },
  { id: "rw2", reportTitle: "SQL injection in search parameter", program: "DataVault", severity: "CRITICAL", amount: 500000, status: "COMPLETED", date: "2026-03-20" },
  { id: "rw3", reportTitle: "CSRF on password change", program: "ShieldNet", severity: "MEDIUM", amount: 80000, status: "PROCESSING", date: "2026-03-28" },
  { id: "rw4", reportTitle: "Privilege escalation via API", program: "DataVault", severity: "CRITICAL", amount: 400000, status: "APPROVED", date: "2026-03-12" },
  { id: "rw5", reportTitle: "Subdomain takeover on staging", program: "CloudBase", severity: "HIGH", amount: 200000, status: "PENDING_APPROVAL", date: "2026-03-05" },
  { id: "rw6", reportTitle: "Insecure direct object reference", program: "Acme Corp", severity: "HIGH", amount: 150000, status: "COMPLETED", date: "2026-03-10" },
];

const statusColors: Record<RewardStatus, string> = {
  PENDING_APPROVAL: "bg-warning/10 text-warning border-warning/20",
  APPROVED: "bg-secondary/10 text-secondary border-secondary/20",
  PROCESSING: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-success/10 text-success border-success/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground",
};

const Rewards = () => {
  const [statusFilter, setStatusFilter] = useState("__all__");

  const { data: apiRewards } = useQuery({
    queryKey: ["users", "me", "rewards"],
    queryFn: () => api.get<unknown[]>(apiPaths.users.meRewards),
    retry: false,
  });

  const rewards: Reward[] = Array.isArray(apiRewards)
    ? apiRewards.map((item, idx) => {
        const row = (item as Record<string, unknown>) ?? {};
        const report = (row.report as Record<string, unknown> | undefined) ?? {};
        const program = (report.program as Record<string, unknown> | undefined) ?? {};
        const payout = (row.payout as Record<string, unknown> | undefined) ?? {};
        return {
          id: String(row.id ?? `rw-${idx}`),
          reportTitle: String(report.title ?? "Reward"),
          program: String(program.title ?? "Program"),
          severity: String(
            report.severityValidated ?? report.severityEstimate ?? "LOW",
          ) as Severity,
          amount: Number(row.amountUsd ?? 0),
          status: String(payout.status ?? "PENDING_APPROVAL") as RewardStatus,
          date: String(row.createdAt ?? new Date().toISOString()),
        };
      })
    : mockRewards;

  const filtered = statusFilter === "__all__" ? rewards : rewards.filter((r) => r.status === statusFilter);
  const totalEarned = rewards.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r.amount, 0);
  const pending = rewards.filter((r) => ["PENDING_APPROVAL", "APPROVED", "PROCESSING"].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const thisMonth = rewards
    .filter((r) => r.status === "COMPLETED" && r.date.startsWith("2026-04"))
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Rewards</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Earned", value: formatCurrency(totalEarned), icon: DollarSign, color: "text-success" },
          { label: "Pending Payout", value: formatCurrency(pending), icon: Clock, color: "text-warning" },
          { label: "This Month", value: formatCurrency(thisMonth), icon: TrendingUp, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Reward History</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled><Download className="mr-2 h-3.5 w-3.5" /> Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.reportTitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.program}</TableCell>
                  <TableCell><SeverityBadge severity={r.severity} /></TableCell>
                  <TableCell className="text-sm font-semibold">{formatCurrency(r.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[r.status] + " text-[10px]"}>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" disabled><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Rewards;
