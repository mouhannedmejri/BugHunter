import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IntegrationCard } from "@/components/IntegrationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import type { IntegrationType } from "@/lib/org-mock-data";

const webhookEvents = [
  "report.submitted",
  "report.resolved",
  "report.accepted",
  "reward.approved",
  "reward.completed",
];

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  isActive?: boolean;
  active?: boolean;
};

type OrgDetail = {
  settings?: Record<string, unknown>;
};

function integrationConnected(settings: Record<string, unknown> | undefined, key: string): boolean {
  const integrations = settings?.integrations as Record<string, unknown> | undefined;
  return Boolean(integrations?.[key]);
}

const OrgIntegrations = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();

  const [configOpen, setConfigOpen] = useState(false);
  const [configType, setConfigType] = useState<IntegrationType | "">("");
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEventsSelected, setWebhookEventsSelected] = useState<string[]>([]);

  const [jiraBase, setJiraBase] = useState("");
  const [jiraProject, setJiraProject] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [linearKey, setLinearKey] = useState("");
  const [linearTeam, setLinearTeam] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");

  const { data: org } = useQuery({
    queryKey: ["orgDetail", orgSlug],
    queryFn: () => api.get<OrgDetail>(apiPaths.organizations.bySlug(orgSlug!)),
    enabled: !!orgSlug,
  });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["orgWebhooks", orgSlug],
    queryFn: () => api.get<WebhookRow[]>(apiPaths.organizations.webhooks(orgSlug!)),
    enabled: !!orgSlug,
  });

  const createWebhook = useMutation({
    mutationFn: () =>
      api.post<WebhookRow>(apiPaths.organizations.webhooks(orgSlug!), {
        url: webhookUrl,
        events: webhookEventsSelected,
        active: true,
      }),
    onSuccess: () => {
      toast.success("Webhook created");
      setWebhookOpen(false);
      setWebhookUrl("");
      setWebhookEventsSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["orgWebhooks", orgSlug] });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => api.delete(apiPaths.organizations.webhookById(orgSlug!, id)),
    onSuccess: () => {
      toast.success("Webhook removed");
      void queryClient.invalidateQueries({ queryKey: ["orgWebhooks", orgSlug] });
    },
  });

  const upsertJira = useMutation({
    mutationFn: () =>
      api.post(apiPaths.organizations.integrationByType(orgSlug!, "jira"), {
        baseUrl: jiraBase,
        projectKey: jiraProject,
        apiToken: jiraToken,
      }),
    onSuccess: () => {
      toast.success("Jira saved");
      setConfigOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["orgDetail", orgSlug] });
    },
  });

  const upsertLinear = useMutation({
    mutationFn: () =>
      api.post(apiPaths.organizations.integrationByType(orgSlug!, "linear"), {
        apiKey: linearKey,
        teamId: linearTeam,
      }),
    onSuccess: () => {
      toast.success("Linear saved");
      setConfigOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["orgDetail", orgSlug] });
    },
  });

  const upsertGithub = useMutation({
    mutationFn: () =>
      api.post(apiPaths.organizations.integrationByType(orgSlug!, "github"), {
        token: ghToken,
        owner: ghOwner,
        repo: ghRepo,
      }),
    onSuccess: () => {
      toast.success("GitHub saved");
      setConfigOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["orgDetail", orgSlug] });
    },
  });

  const settings = org?.settings;
  const cards: Array<{
    type: IntegrationType;
    name: string;
    description: string;
    connected: boolean;
    icon: string;
  }> = [
    {
      type: "JIRA",
      name: "Jira",
      description: "Sync reports with Jira issues",
      connected: integrationConnected(settings, "jira"),
      icon: "🔵",
    },
    {
      type: "LINEAR",
      name: "Linear",
      description: "Push reports to Linear projects",
      connected: integrationConnected(settings, "linear"),
      icon: "🟣",
    },
    {
      type: "GITHUB",
      name: "GitHub Issues",
      description: "Create GitHub issues from reports",
      connected: integrationConnected(settings, "github"),
      icon: "⚫",
    },
    {
      type: "SLACK",
      name: "Slack",
      description: "Notifications use webhooks below",
      connected: webhooks.some((w) => w.url.includes("slack")),
      icon: "💬",
    },
  ];

  const openConfigure = (t: IntegrationType) => {
    setConfigType(t);
    setConfigOpen(true);
  };

  const submitIntegration = () => {
    if (configType === "JIRA") {
      upsertJira.mutate();
      return;
    }
    if (configType === "LINEAR") {
      upsertLinear.mutate();
      return;
    }
    if (configType === "GITHUB") {
      upsertGithub.mutate();
      return;
    }
    toast.info("Configure this integration in the backend when available.");
    setConfigOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Integrations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((i) => (
          <IntegrationCard
            key={i.type}
            integration={i}
            onConfigure={() => openConfigure(i.type)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Webhooks
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setWebhookOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{wh.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wh.isActive ?? wh.active ? "default" : "secondary"}>
                        {wh.isActive ?? wh.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteWebhook.mutate(wh.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {configType}</DialogTitle>
            <DialogDescription>Credentials are sent to the API over HTTPS and stored server-side.</DialogDescription>
          </DialogHeader>
          {configType === "JIRA" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Jira base URL</Label>
                <Input value={jiraBase} onChange={(e) => setJiraBase(e.target.value)} placeholder="https://company.atlassian.net" />
              </div>
              <div className="space-y-2">
                <Label>Project key</Label>
                <Input value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>API token</Label>
                <Input type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} />
              </div>
            </div>
          )}
          {configType === "LINEAR" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>API key</Label>
                <Input type="password" value={linearKey} onChange={(e) => setLinearKey(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Team ID</Label>
                <Input value={linearTeam} onChange={(e) => setLinearTeam(e.target.value)} />
              </div>
            </div>
          )}
          {configType === "GITHUB" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Token</Label>
                <Input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Repo</Label>
                <Input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} />
              </div>
            </div>
          )}
          {configType === "SLACK" && (
            <p className="text-sm text-muted-foreground">Add a webhook URL below and select events.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button
              onClick={submitIntegration}
              disabled={upsertJira.isPending || upsertLinear.isPending || upsertGithub.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>Your endpoint receives signed HTTP callbacks for selected events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2">
                {webhookEvents.map((ev) => (
                  <div key={ev} className="flex items-center gap-2">
                    <Checkbox
                      checked={webhookEventsSelected.includes(ev)}
                      onCheckedChange={(c) =>
                        setWebhookEventsSelected((prev) =>
                          c ? [...prev, ev] : prev.filter((x) => x !== ev),
                        )
                      }
                    />
                    <span className="text-sm font-mono">{ev}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createWebhook.mutate()}
              disabled={!webhookUrl || webhookEventsSelected.length === 0 || createWebhook.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgIntegrations;
