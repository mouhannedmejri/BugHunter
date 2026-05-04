import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, MoreHorizontal, Mail, Loader2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrgRole } from "@/lib/org-mock-data";
import { toast } from "sonner";
import { api, apiPaths } from "@/lib/api";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

type MemberRow = {
  id: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
  email?: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: OrgRole;
  createdAt: string;
  expiresAt: string;
};

const OrgMembers = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("VIEWER");

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["orgMembers", orgSlug],
    queryFn: () => api.get<MemberRow[]>(apiPaths.organizations.members(orgSlug!)),
    enabled: !!orgSlug,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["orgInvites", orgSlug],
    queryFn: () => api.get<InviteRow[]>(apiPaths.organizations.invites(orgSlug!)),
    enabled: !!orgSlug,
    retry: false,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.post(apiPaths.organizations.inviteMember(orgSlug!), {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      void queryClient.invalidateQueries({ queryKey: ["orgInvites", orgSlug] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) =>
      api.delete(apiPaths.organizations.inviteById(orgSlug!, inviteId)),
    onSuccess: () => {
      toast.success("Invite revoked");
      void queryClient.invalidateQueries({ queryKey: ["orgInvites", orgSlug] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      api.put(apiPaths.organizations.memberRole(orgSlug!, userId), { role }),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: ["orgMembers", orgSlug] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(apiPaths.organizations.memberByUserId(orgSlug!, userId)),
    onSuccess: () => {
      toast.success("Member removed");
      void queryClient.invalidateQueries({ queryKey: ["orgMembers", orgSlug] });
    },
  });

  const currentUserId = user?.id;
  const currentMembership = members.find((m) => m.userId === currentUserId);
  const canManageMembers = currentMembership?.role === "ORG_ADMIN";

  if (loadingMembers) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <Button
          className="gap-1.5"
          onClick={() => setInviteOpen(true)}
          disabled={!canManageMembers}
        >
          <UserPlus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Invites</h2>
          <div className="border border-border rounded-lg divide-y divide-border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">{inv.role}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeMutation.mutate(inv.id)}
                  disabled={revokeMutation.isPending}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const name = m.displayName ?? m.username ?? "Member";
              const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.email ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        roleMutation.mutate({ userId: m.userId, role: v as OrgRole })
                      }
                      disabled={roleMutation.isPending || !canManageMembers}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["ORG_ADMIN", "PROGRAM_MANAGER", "REVIEWER", "FINANCE", "VIEWER"] as OrgRole[]).map(
                          (r) => (
                            <SelectItem key={r} value={r}>
                              {r.replace("_", " ")}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!canManageMembers && m.userId !== currentUserId}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(canManageMembers || m.userId === currentUserId) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMutation.mutate(m.userId)}
                          >
                            {m.userId === currentUserId ? "Leave organization" : "Remove member"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["ORG_ADMIN", "PROGRAM_MANAGER", "REVIEWER", "FINANCE", "VIEWER"] as OrgRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgMembers;
