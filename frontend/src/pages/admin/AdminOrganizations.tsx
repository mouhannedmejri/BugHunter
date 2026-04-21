import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Eye, Ban, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const planColors: Record<string, string> = {
  FREE: "bg-muted text-muted-foreground",
  PRO: "bg-primary text-primary-foreground",
  ENTERPRISE: "bg-warning text-warning-foreground",
};

const AdminOrganizations = () => {
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await api.get('/admin/organizations');
        const orgsData = Array.isArray(response) ? response : [];
        setOrganizations(orgsData);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        toast.error('Failed to load organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return organizations;
    return organizations.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase()));
  }, [search, organizations]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <Badge variant="secondary" className="text-xs">{filtered.length} orgs</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center text-xs font-medium">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-muted-foreground">@{org.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${planColors[org.plan || 'FREE']}`}>
                      {org.plan || 'FREE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.suspended ? "destructive" : "outline"} className="text-[10px]">
                      {org.suspended ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-3.5 w-3.5" /> View
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <CreditCard className="mr-2 h-3.5 w-3.5" /> Change Plan
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem>FREE</DropdownMenuItem>
                            <DropdownMenuItem>PRO</DropdownMenuItem>
                            <DropdownMenuItem>ENTERPRISE</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem>
                          <Ban className="mr-2 h-3.5 w-3.5" /> {org.suspended ? "Unsuspend" : "Suspend"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminOrganizations;
