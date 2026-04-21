import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MDEditor } from "@/components/MDEditor";
import { RewardTierTable } from "@/components/RewardTierTable";
import { ScopeAssetTable } from "@/components/ScopeAssetTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import type { Severity } from "@/lib/mock-data";
import type { Asset } from "@/lib/mock-data";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { Loader2 } from "lucide-react";

type ProgramDetailResponse = {
  program: {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    status: string;
    rewardPolicy: Record<Severity, { min: number; max: number }>;
  };
  assets: Asset[];
  access: { canViewScope: boolean };
};

const defaultTiers: Record<Severity, { min: number; max: number }> = {
  CRITICAL: { min: 0, max: 0 },
  HIGH: { min: 0, max: 0 },
  MEDIUM: { min: 0, max: 0 },
  LOW: { min: 0, max: 0 },
  INFORMATIONAL: { min: 0, max: 0 },
};

const ProgramSettings = () => {
  const { orgSlug, programSlug } = useParams<{ orgSlug: string; programSlug: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardTiers, setRewardTiers] = useState(defaultTiers);
  const [status, setStatus] = useState("DRAFT");

  const { data, isLoading } = useQuery({
    queryKey: ["programDetail", programSlug],
    queryFn: () => api.get<ProgramDetailResponse>(apiPaths.programs.bySlug(programSlug!)),
    enabled: !!programSlug,
  });

  useEffect(() => {
    if (!data?.program) return;
    setTitle(data.program.title);
    setDescription(data.program.description);
    setStatus(data.program.status);
    const rp = data.program.rewardPolicy;
    if (rp && typeof rp === "object") {
      setRewardTiers({
        CRITICAL: rp.CRITICAL ?? defaultTiers.CRITICAL,
        HIGH: rp.HIGH ?? defaultTiers.HIGH,
        MEDIUM: rp.MEDIUM ?? defaultTiers.MEDIUM,
        LOW: rp.LOW ?? defaultTiers.LOW,
        INFORMATIONAL: rp.INFORMATIONAL ?? defaultTiers.INFORMATIONAL,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(apiPaths.programs.bySlug(programSlug!), {
        title,
        description,
        rewardPolicy: rewardTiers,
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: ["programDetail", programSlug] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (next: string) =>
      api.put(apiPaths.programs.status(programSlug!), { status: next }),
    onSuccess: () => {
      toast.success("Program status updated");
      void queryClient.invalidateQueries({ queryKey: ["programDetail", programSlug] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { program, assets, access } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{program.title}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{program.type}</Badge>
            <Badge variant={program.status === "ACTIVE" ? "default" : "secondary"}>{program.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/org/${orgSlug}/programs/${programSlug}/assets`}>Manage scope</Link>
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs text-muted-foreground">Lifecycle</Label>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            statusMutation.mutate(v);
          }}
        >
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">DRAFT</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="PAUSED">PAUSED</SelectItem>
            <SelectItem value="CLOSED">CLOSED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="launch">Launch</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Program Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <MDEditor label="Description" value={description} onChange={setDescription} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Reward Tiers (stored in cents)</CardTitle></CardHeader>
            <CardContent>
              <RewardTierTable value={rewardTiers} onChange={setRewardTiers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scope" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>In-scope assets (summary)</CardTitle></CardHeader>
            <CardContent>
              {!access.canViewScope ? (
                <p className="text-sm text-muted-foreground">You do not have access to view program scope.</p>
              ) : (
                <ScopeAssetTable
                  assets={assets}
                  onToggle={() => toast.info("Toggle scope from the Scope Manager page")}
                  onEdit={() => {}}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="launch" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Launch dates and legal terms can be extended here; for now edit the program via API or expand this form.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgramSettings;
