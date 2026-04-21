import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportSlideOver } from "@/components/ReportSlideOver";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, Search, Filter, Clock, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { useParams } from "react-router-dom";
import type { ReportSlideOverReport } from "@/components/ReportSlideOver";
import type { ReportStatus, Severity } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type TriageRow = {
  id: string;
  title: string;
  severityEstimate: Severity;
  severityValidated?: Severity | null;
  status: ReportStatus;
  createdAt: string;
  program?: { id: string; title: string; slug: string };
  asset?: { identifier: string } | null;
  submitter: { username: string; displayName?: string | null };
  assignee?: { username: string; displayName?: string | null } | null;
  slaRecords: Array<{ metricKey: string; dueAt: string; breached: boolean }>;
};

function farFutureIso() {
  return new Date(Date.now() + 365 * 86400000).toISOString();
}

function triageRowToSlideOver(r: TriageRow): ReportSlideOverReport {
  const sev = (r.severityValidated ?? r.severityEstimate) as Severity;
  const pickDue = (key: string) => r.slaRecords?.find((s) => s.metricKey === key)?.dueAt;
  return {
    id: r.id,
    shortId: `#${r.id.slice(0, 8).toUpperCase()}`,
    title: r.title,
    severity: sev,
    status: r.status,
    programTitle: r.program?.title ?? "—",
    programSlug: r.program?.slug,
    asset: r.asset?.identifier,
    createdAt: r.createdAt,
    submitter: {
      name: r.submitter.displayName ?? r.submitter.username,
      username: r.submitter.username,
    },
    assignee: r.assignee
      ? { name: r.assignee.displayName ?? r.assignee.username, username: r.assignee.username }
      : undefined,
    slaFirstResponse: pickDue("FIRST_RESPONSE") ?? farFutureIso(),
    slaTriage: pickDue("TRIAGE_DECISION") ?? farFutureIso(),
    slaResolution: pickDue("FIX") ?? farFutureIso(),
  };
}

const severities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
const statuses: ReportStatus[] = [
  "SUBMITTED",
  "RECEIVED",
  "NEEDS_INFO",
  "TRIAGING",
  "ACCEPTED",
  "RESOLVED",
  "REWARDED",
  "DUPLICATE",
  "CLOSED",
];

const PAGE_SIZE = 20;

type SlaRecordRow = { dueAt: string; breached: boolean };

const getSlaTimeLeft = (records: SlaRecordRow[]) => {
  if (!records || records.length === 0) return { text: "No SLA", color: "text-muted-foreground", status: "OK" };
  const nearest = [...records].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
  if (nearest.breached) return { text: "Breached", color: "text-destructive", status: "BREACHED" };

  const diff = new Date(nearest.dueAt).getTime() - Date.now();
  if (diff <= 0) return { text: "Overdue", color: "text-destructive", status: "BREACHED" };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 1) return { text: `${days}d ${hours % 24}h`, color: "text-success", status: "OK" };
  return { text: `${hours}h`, color: "text-warning", status: "AT_RISK" };
};

const getSlaTotal = (records: SlaRecordRow[]) => {
  if (!records || records.length === 0) return "No SLA";
  const nearest = [...records].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
  const diff = new Date(nearest.dueAt).getTime() - Date.now();
  if (diff <= 0 || nearest.breached) return "Overdue";
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
};

const TriageQueue = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("__all__");
  const [programFilter, setProgramFilter] = useState("__all__");
  const [assetSearch, setAssetSearch] = useState("");
  const [slaFilter, setSlaFilter] = useState("__all__");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [slideReport, setSlideReport] = useState<ReportSlideOverReport | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [bulkCloseOpen, setBulkCloseOpen] = useState(false);
  const [bulkCloseReason, setBulkCloseReason] = useState("");
  const [bulkAssigneeId, setBulkAssigneeId] = useState("__none__");

  const { data: programsData } = useQuery({
    queryKey: ["orgPrograms", orgSlug],
    queryFn: () => api.get<Array<{ id: string; slug: string; title: string }>>(apiPaths.organizations.programs(orgSlug!)),
    enabled: !!orgSlug,
  });

  const { data: membersData } = useQuery({
    queryKey: ["orgMembers", orgSlug],
    queryFn: () =>
      api.get<
        Array<{ userId: string; username: string; displayName?: string | null }>
      >(apiPaths.organizations.members(orgSlug!)),
    enabled: !!orgSlug,
  });

  const selectedProgramId = programsData?.find((p) => p.slug === programFilter)?.id;
  const programFilterReady = programFilter === "__all__" || !!selectedProgramId;

  const triageQueryKey = [
    "triage",
    orgSlug,
    page,
    severityFilter,
    statusFilter,
    assigneeFilter,
    programFilter,
    selectedProgramId,
    assetSearch,
    slaFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ];

  const { data: triageData, isLoading } = useQuery({
    queryKey: triageQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", PAGE_SIZE.toString());
      if (statusFilter.length > 0) params.set("status", statusFilter[0]);
      if (severityFilter.length > 0) params.set("severity", severityFilter[0]);
      if (assigneeFilter !== "__all__") params.set("assigneeId", assigneeFilter);
      if (programFilter !== "__all__" && selectedProgramId) {
        params.set("programId", selectedProgramId);
      }
      if (dateFrom) params.set("dateFrom", dateFrom.toISOString());
      if (dateTo) params.set("dateTo", dateTo.toISOString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (slaFilter !== "__all__") params.set("hasBreachedSla", slaFilter === "BREACHED" ? "true" : "false");

      return api.get<{ reports: TriageRow[]; pagination: { page: number; totalPages: number; total: number } }>(
        `${apiPaths.organizations.triage(orgSlug!)}?${params.toString()}`,
      );
    },
    enabled: !!orgSlug && programFilterReady,
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      api.post(apiPaths.organizations.orgReportsBulkAssign(orgSlug!), {
        reportIds: selectedIds,
        assigneeId,
      }),
    onSuccess: () => {
      toast.success("Reports assigned");
      setSelectedIds([]);
      setBulkAssigneeId("__none__");
      void queryClient.invalidateQueries({ queryKey: ["triage", orgSlug] });
    },
  });

  const bulkCloseMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post(apiPaths.organizations.orgReportsBulkClose(orgSlug!), {
        reportIds: selectedIds,
        reason,
      }),
    onSuccess: () => {
      toast.success("Reports closed");
      setSelectedIds([]);
      setBulkCloseReason("");
      setBulkCloseOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["triage", orgSlug] });
    },
  });

  const reports = triageData?.reports ?? [];
  const pagination = triageData?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const totalPages = pagination.totalPages;

  // Local client-side search across the active page results, since search parameter wasn't mapped tightly to backend schema originally
  const filteredReports = search
    ? reports.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.id.toLowerCase().includes(search.toLowerCase()),
      )
    : reports;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.length === filteredReports.length ? [] : filteredReports.map((r) => r.id),
    );

  const clearFilters = () => {
    setSeverityFilter([]);
    setStatusFilter([]);
    setAssigneeFilter("__all__");
    setProgramFilter("__all__");
    setAssetSearch("");
    setSlaFilter("__all__");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
    setSearch("");
  };

  const hasActiveFilters = severityFilter.length > 0 || statusFilter.length > 0 || assigneeFilter !== "__all__" || programFilter !== "__all__" || assetSearch || slaFilter !== "__all__" || dateFrom || dateTo || search;

  return (
    <div className="flex h-full animate-fade-in relative max-h-[calc(100vh-3.5rem)]">
      {/* Filters sidebar */}
      {filtersOpen && (
        <div className="w-64 border-r border-border p-4 space-y-4 shrink-0 hidden lg:block overflow-auto h-full">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Filters</h3>
            <div className="flex items-center gap-1">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiltersOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
            {statuses.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox
                  checked={statusFilter.includes(s)}
                  onCheckedChange={(c) => { setStatusFilter((prev) => c ? [s] : []); setPage(1); }}
                />
                <span className="text-sm">{s.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Severity</label>
            {severities.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox
                  checked={severityFilter.includes(s)}
                  onCheckedChange={(c) => { setSeverityFilter((prev) => c ? [s] : []); setPage(1); }}
                />
                <SeverityBadge severity={s} />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Assignee</label>
            <Select value={assigneeFilter} onValueChange={(v) => { setAssigneeFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {membersData?.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName || m.username || "Member"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Program</label>
            <Select value={programFilter} onValueChange={(v) => { setProgramFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {programsData?.map((p) => (
                  <SelectItem key={p.id} value={p.slug}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">SLA Status</label>
            <Select value={slaFilter} onValueChange={(v) => { setSlaFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="BREACHED">Breached</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-full h-8 justify-start text-left text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {dateFrom ? format(dateFrom, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-full h-8 justify-start text-left text-xs font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {dateTo ? format(dateTo, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="border-b border-border p-4 flex flex-wrap items-center gap-3 bg-card sticky top-0 z-20">
          {!filtersOpen && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFiltersOpen(true)}>
              <Filter className="h-3.5 w-3.5" /> Filters
              {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">!</Badge>}
            </Button>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter active page..." className="pl-9 h-9" />
          </div>
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
            const [b, o] = v.split('-');
            setSortBy(b);
            setSortOrder(o);
            setPage(1);
          }}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest</SelectItem>
              <SelectItem value="createdAt-asc">Oldest</SelectItem>
              <SelectItem value="severity-desc">Severity</SelectItem>
              <SelectItem value="slaUrgency-asc">SLA Urgency</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">{pagination.total} reports</Badge>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="border-b border-border bg-muted/50 px-4 py-2 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Select value={bulkAssigneeId} onValueChange={setBulkAssigneeId}>
              <SelectTrigger className="h-7 w-44 text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Choose assignee…</SelectItem>
                {membersData?.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName || m.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={bulkAssigneeId === "__none__" || bulkAssignMutation.isPending}
              onClick={() => bulkAssignMutation.mutate(bulkAssigneeId)}
            >
              Assign
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setBulkCloseOpen(true)}
              disabled={bulkCloseMutation.isPending}
            >
              Close
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-muted-foreground">No reports found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filter criteria or search</p>
              {hasActiveFilters && (
                <Button variant="link" className="mt-2 text-sm" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.length === filteredReports.length && filteredReports.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Seq</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((r) => {
                  const slaActive = getSlaTimeLeft(r.slaRecords);
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSlideReport(triageRowToSlideOver(r))}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{r.id.split('-')[0].toUpperCase()}</TableCell>
                      <TableCell className="max-w-[250px]">
                        <span className="truncate block text-sm font-medium">{r.title.slice(0, 60)}{r.title.length > 60 ? "…" : ""}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.program?.title}</TableCell>
                      <TableCell><SeverityBadge severity={r.severityEstimate} /></TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell>
                        {r.assignee ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-muted">
                                  {(r.assignee.displayName ?? r.assignee.username)?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{r.assignee.displayName || r.assignee.username}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("flex items-center gap-1 text-xs font-mono font-medium", slaActive.color)}>
                              <Clock className="h-3 w-3" /> {getSlaTotal(r.slaRecords)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <div className="space-y-1 text-xs">
                              <span className="text-muted-foreground">Nearest Deadline:</span>
                              <span className={cn("font-mono font-medium block", slaActive.color)}>{slaActive.text}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Backed natively by API limits */}
        {totalPages > 1 && (
          <div className="border-t border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} records
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ReportSlideOver
        report={slideReport}
        orgSlug={orgSlug}
        open={!!slideReport}
        onClose={() => setSlideReport(null)}
      />

      <Dialog open={bulkCloseOpen} onOpenChange={setBulkCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {selectedIds.length} reports</DialogTitle>
            <DialogDescription>A reason is required. Only program managers and org admins can bulk-close.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={bulkCloseReason}
              onChange={(e) => setBulkCloseReason(e.target.value)}
              rows={3}
              placeholder="Explain why these reports are being closed…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCloseOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!bulkCloseReason.trim() || bulkCloseMutation.isPending}
              onClick={() => bulkCloseMutation.mutate(bulkCloseReason.trim())}
            >
              Close reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TriageQueue;
