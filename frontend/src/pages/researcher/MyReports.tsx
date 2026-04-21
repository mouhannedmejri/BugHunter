import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import type { Report, Severity, ReportStatus } from "@/interfaces/Interfaces";
import { api, apiPaths } from "@/lib/api";
import { Search, FileEdit, Eye } from "lucide-react";
import { format } from "date-fns";

const allStatuses: ReportStatus[] = [
  "DRAFT", "SUBMITTED", "RECEIVED", "NEEDS_INFO", "TRIAGING",
  "ACCEPTED", "DUPLICATE", "INFORMATIVE", "NOT_APPLICABLE",
  "OUT_OF_SCOPE", "RESOLVED", "REWARDED", "CLOSED", "ESCALATED",
];

const allSeverities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];

export default function MyReports() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get<{ items: Report[]; total: number }>(apiPaths.reports.me);
        setReports(res.items);
      } catch (err) {
        // error toast handled by api interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const programs = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.programTitle).filter(Boolean)));
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (programFilter !== "all" && r.programTitle !== programFilter) return false;
      return true;
    });
  }, [reports, search, statusFilter, severityFilter, programFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Reports</h1>
        <p className="text-sm text-muted-foreground">Track your vulnerability submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {allSeverities.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Program</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
              <TableHead className="hidden md:table-cell text-right">Reward</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16" /></TableCell>
                </TableRow>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No reports found
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map((report) => (
              <TableRow
                key={report.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <TableCell className="font-medium text-foreground max-w-[250px] truncate">
                  {report.title}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {report.programTitle}
                </TableCell>
                <TableCell><SeverityBadge severity={report.severity} /></TableCell>
                <TableCell><StatusBadge status={report.status} /></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right text-sm font-medium">
                  {report.reward ? formatCurrency(report.reward) : "—"}
                </TableCell>
                <TableCell>
                  {report.status === "DRAFT" ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); }}>
                      <FileEdit className="h-3 w-3" /> Edit
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); navigate(`/reports/${report.id}`); }}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
