import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string | null;
  description?: string | null;
  billingEmail?: string | null;
  plan?: string;
};

const OrgSettings = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.platformRole === "SUPER_ADMIN";

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: ["orgDetail", orgSlug],
    queryFn: () => api.get<OrgDetail>(apiPaths.organizations.bySlug(orgSlug!)),
    enabled: !!orgSlug,
  });

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setWebsite(org.website ?? "");
    setDescription(org.description ?? "");
    setBillingEmail(org.billingEmail ?? "");
  }, [org]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put<OrgDetail>(apiPaths.organizations.bySlug(orgSlug!), {
        name,
        website: website || null,
        description: description || null,
        billingEmail: billingEmail || null,
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: ["orgDetail", orgSlug] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<{ message: string }>(apiPaths.organizations.bySlug(orgSlug!)),
    onSuccess: () => {
      toast.success("Organization deleted");
      setDeleteOpen(false);
      window.location.assign("/dashboard");
    },
  });

  if (isLoading || !org) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={org.slug} readOnly className="font-mono bg-muted/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Billing email</Label>
            <Input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@company.com"
            />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="text-sm">{org.plan ?? "FREE"}</Badge>
            <span className="text-sm text-muted-foreground">Plan from database</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Stripe billing portal integration can be wired here when checkout is enabled.
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting an organization is restricted to platform super admins and soft-deletes data on the server.
          </p>
          <Button
            variant="destructive"
            disabled={!isSuperAdmin}
            onClick={() => setDeleteOpen(true)}
          >
            Delete Organization
          </Button>
          {!isSuperAdmin && (
            <p className="text-xs text-muted-foreground mt-2">Only a super admin can delete an organization.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Type <span className="font-mono font-bold">{org.slug}</span> to confirm</Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={org.slug}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== org.slug || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgSettings;
