import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScopeAssetTable } from "@/components/ScopeAssetTable";
import { Plus, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import type { AssetType, Asset } from "@/lib/mock-data";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";

const assetTypes: AssetType[] = [
  "DOMAIN",
  "SUBDOMAIN",
  "IP_RANGE",
  "MOBILE_APP",
  "API",
  "REPOSITORY",
  "CLOUD",
  "THIRD_PARTY",
  "PHYSICAL",
];

type AssetRow = {
  id: string;
  type: string;
  identifier: string;
  description?: string | null;
  inScope: boolean;
};

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    type: row.type as AssetType,
    identifier: row.identifier,
    description: row.description ?? undefined,
    inScope: row.inScope,
  };
}

const ScopeManager = () => {
  const { programSlug } = useParams<{ programSlug: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("in-scope");
  const [newType, setNewType] = useState<AssetType>("DOMAIN");
  const [newId, setNewId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [wildcard, setWildcard] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["programAssets", programSlug],
    queryFn: () =>
      api.get<{ items: AssetRow[] }>(`${apiPaths.programs.assets(programSlug!)}?limit=200`),
    enabled: !!programSlug,
  });

  const items = data?.items ?? [];
  const assets = items.map(toAsset);
  const inScope = assets.filter((a) => a.inScope);
  const outScope = assets.filter((a) => !a.inScope);

  const addMutation = useMutation({
    mutationFn: () => {
      if (!programSlug) throw new Error("Missing program");
      const raw = newId.trim();
      if (!raw) throw new Error("Identifier required");
      const identifier = wildcard ? raw.replace(/^\*\./, "") : raw;
      const wildcardSupport = wildcard || raw.startsWith("*.") || raw.startsWith("*.");
      return api.post(apiPaths.programs.assets(programSlug), {
        type: newType,
        identifier,
        description: newDesc.trim() || null,
        inScope: tab === "in-scope",
        wildcardSupport,
      });
    },
    onSuccess: () => {
      toast.success("Asset added");
      setNewId("");
      setNewDesc("");
      setWildcard(false);
      void queryClient.invalidateQueries({ queryKey: ["programAssets", programSlug] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(apiPaths.programs.toggleAssetScope(programSlug!, id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programAssets", programSlug] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Scope Manager</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{assetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Identifier</Label>
              <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g., example.com" className="h-9" />
            </div>
            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs">Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional" className="h-9" />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Switch checked={wildcard} onCheckedChange={setWildcard} />
              <span className="text-xs text-muted-foreground">Wildcard</span>
            </div>
            <Button
              size="sm"
              className="h-9 gap-1"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="in-scope">In Scope ({inScope.length})</TabsTrigger>
          <TabsTrigger value="out-scope">Out of Scope ({outScope.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="in-scope" className="mt-4">
          <ScopeAssetTable
            assets={inScope}
            onToggle={(id) => toggleMutation.mutate(id)}
            onEdit={() => toast.info("Edit asset fields from API or extend UI")}
          />
        </TabsContent>
        <TabsContent value="out-scope" className="mt-4">
          <ScopeAssetTable
            assets={outScope}
            onToggle={(id) => toggleMutation.mutate(id)}
            onEdit={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScopeManager;
