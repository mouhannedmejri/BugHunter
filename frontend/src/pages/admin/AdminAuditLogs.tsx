import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Download, Eye } from "lucide-react";
import { mockAdminAuditLogs, type AdminAuditLog } from "@/lib/admin-mock-data";
import { toast } from "sonner";

const AdminAuditLogs = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("__all__");
  const [entityFilter, setEntityFilter] = useState("__all__");
  const [diffOpen, setDiffOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const actions = [...new Set(mockAdminAuditLogs.map((l) => l.action))];
  const entities = [...new Set(mockAdminAuditLogs.map((l) => l.entityType))];

  const filtered = useMemo(() => {
    let results = [...mockAdminAuditLogs];
    if (search) results = results.filter((l) => l.actor.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()));
    if (actionFilter !== "__all__") results = results.filter((l) => l.action === actionFilter);
    if (entityFilter !== "__all__") results = results.filter((l) => l.entityType === entityFilter);
    return results;
  }, [search, actionFilter, entityFilter]);

  const openDiff = (log: AdminAuditLog) => {
    setSelectedLog(log);
    setDiffOpen(true);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("CSV export started")}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by actor or action..." className="pl-9 h-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Entities</SelectItem>
            {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDiff(l)}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-sm">{l.actor}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] font-mono">{l.action}</Badge></TableCell>
                <TableCell className="text-sm">{l.entityType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{l.entityId}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{l.ip}</TableCell>
                <TableCell>
                  {(l.before || l.after) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openDiff(l); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>{selectedLog?.action} by {selectedLog?.actor}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Before</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48 font-mono">
                  {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">After</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48 font-mono">
                  {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLogs;
