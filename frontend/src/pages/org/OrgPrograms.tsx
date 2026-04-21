import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { Loader2 } from "lucide-react";

type OrgProgramRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  totalPaidUsd?: number;
  createdAt?: string;
  _count?: { reports?: number };
};

const OrgPrograms = () => {
  const { orgSlug } = useParams();

  const { data: programs, isLoading } = useQuery({
    queryKey: ["orgPrograms", orgSlug],
    queryFn: () => api.get<OrgProgramRow[]>(apiPaths.organizations.programs(orgSlug!)),
    enabled: !!orgSlug,
  });

  if (isLoading || !programs) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <Button className="gap-1.5" asChild>
          <Link to={`/org/${orgSlug}/programs/new`}>
            <Plus className="h-4 w-4" /> Create Program
          </Link>
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open Reports</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    to={`/org/${orgSlug}/programs/${p.slug}/settings`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {p.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={p.status === "ACTIVE" ? "default" : p.status === "DRAFT" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {p._count?.reports ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(p.totalPaidUsd ?? 0)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrgPrograms;
