import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramCard } from "@/components/ProgramCard";
import { mockPrograms } from "@/lib/mock-data";
import type { Program } from "@/lib/mock-data";
import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { mapProgram } from "@/lib/backend-bridge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeFilters = ["ALL", "PUBLIC", "PRIVATE", "CAMPAIGN", "CHALLENGE"] as const;
const statusFilters = ["ALL", "ACTIVE", "PAUSED", "CLOSED"] as const;

type SortOption = "newest" | "highest_reward" | "most_active";

const Programs = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<SortOption>("newest");

  const { data: programs = mockPrograms, isLoading } = useQuery({
    queryKey: ["researcherPrograms"],
    queryFn: async () => {
      const response = await api.get<unknown[] | { items?: unknown[] }>(apiPaths.programs.root);
      const raw = Array.isArray(response) ? response : response.items ?? [];
      return raw.map((p) => mapProgram((p as Record<string, unknown>) ?? {}));
    },
  });

  const filtered = useMemo(() => {
    let results = programs.filter((p) => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.orgName.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "ALL" || p.type === typeFilter;
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });

    results.sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "highest_reward") return b.rewardRange.max - a.rewardRange.max;
      return b.openReports - a.openReports;
    });

    return results;
  }, [programs, search, typeFilter, statusFilter, sort]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Discover Programs</h1>
        <p className="text-sm text-muted-foreground">Find bug bounty programs to submit to</p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs or organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="highest_reward">Highest Reward</SelectItem>
            <SelectItem value="most_active">Most Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-muted-foreground self-center mr-1">Type:</span>
        {typeFilters.map((t) => (
          <Badge
            key={t}
            variant="outline"
            className={cn(
              "cursor-pointer text-xs transition-colors",
              typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            )}
            onClick={() => setTypeFilter(t)}
          >
            {t === "ALL" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
          </Badge>
        ))}
        <span className="text-xs font-medium text-muted-foreground self-center ml-3 mr-1">Status:</span>
        {statusFilters.map((s) => (
          <Badge
            key={s}
            variant="outline"
            className={cn(
              "cursor-pointer text-xs transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            )}
            onClick={() => setStatusFilter(s)}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No programs match your filters.</p>
          <Button variant="link" className="text-primary mt-2" onClick={() => { setSearch(""); setTypeFilter("ALL"); setStatusFilter("ALL"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Programs;
