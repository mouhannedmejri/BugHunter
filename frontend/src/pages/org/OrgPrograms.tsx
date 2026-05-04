import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { Loader2 } from "lucide-react";

type RewardTier = { min: number; max: number };
type RewardPolicy = Partial<Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL", RewardTier>>;

type OrgProgramRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  rewardPolicy?: RewardPolicy;
  inScopeDomains?: string[];
  outOfScopeDomains?: string[];
  totalPaidUsd?: number;
  createdAt?: string;
  _count?: { reports?: number };
};

function summarizeRewardGrid(policy?: RewardPolicy) {
  if (!policy) return "—";
  const ordered: Array<keyof RewardPolicy> = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
  const labels = ordered
    .filter((severity) => policy[severity])
    .map((severity) => {
      const tier = policy[severity]!;
      return `${severity}: ${formatCurrency(tier.min)}-${formatCurrency(tier.max)}`;
    });
  return labels.length ? labels.join(" | ") : "—";
}

function joinDomains(domains?: string[]) {
  if (!domains || domains.length === 0) return "—";
  return domains.join(", ");
}

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
              <TableHead>Reward Grid</TableHead>
              <TableHead>In Scope Domains</TableHead>
              <TableHead>Out of Scope Domains</TableHead>
              <TableHead className="text-right">Open Reports</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-xs text-muted-foreground max-w-[360px]">
                  <span className="line-clamp-2">{summarizeRewardGrid(p.rewardPolicy)}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                  <span className="line-clamp-2">{joinDomains(p.inScopeDomains)}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                  <span className="line-clamp-2">{joinDomains(p.outOfScopeDomains)}</span>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/org/${orgSlug}/members`}>Add User</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to={`/org/${orgSlug}/programs/${p.slug}/settings`}>Manage</Link>
                    </Button>
                  </div>
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
