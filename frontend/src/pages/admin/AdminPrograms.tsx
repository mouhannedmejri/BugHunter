import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Eye, XCircle } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { mockAdminPrograms } from "@/lib/admin-mock-data";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const typeColors: Record<string, string> = {
  PUBLIC: "bg-success/10 text-success border-success/20",
  PRIVATE: "bg-warning/10 text-warning border-warning/20",
  CHALLENGE: "bg-primary/10 text-primary border-primary/20",
  CAMPAIGN: "bg-secondary/10 text-secondary border-secondary/20",
};

const AdminPrograms = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return mockAdminPrograms;
    return mockAdminPrograms.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.orgName.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <Badge variant="secondary" className="text-xs">{filtered.length} programs</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programs..." className="pl-9 h-9" />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open Reports</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.orgName}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${typeColors[p.type]}`}>{p.type}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{p.status}</Badge></TableCell>
                <TableCell className="text-right font-mono">{p.openReports}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/programs/${p.id}`)}><Eye className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => { setCloseTarget(p.id); setCloseOpen(true); }}>
                        <XCircle className="mr-2 h-3.5 w-3.5" /> Force Close
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Close Program</DialogTitle>
            <DialogDescription>This will immediately close the program and prevent new submissions. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { toast.success("Program force closed"); setCloseOpen(false); }}>Force Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPrograms;
