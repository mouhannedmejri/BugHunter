import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Ban, Eye, UserCog, LogIn, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "AUDITOR" | "USER" | "ORG_MEMBER";
type KycStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  platformRole: PlatformRole;
  kycStatus: KycStatus;
  banned: boolean;
  country: string;
  joinedAt: string;
  lastLogin: string;
}

const roleColors: Record<PlatformRole, string> = {
  SUPER_ADMIN: 'bg-destructive text-destructive-foreground',
  SUPPORT: 'bg-warning text-warning-foreground',
  AUDITOR: 'bg-blue-500 text-white',
  USER: 'bg-secondary text-secondary-foreground',
  ORG_MEMBER: 'bg-muted text-muted-foreground',
};

const kycColors: Record<KycStatus, string> = {
  VERIFIED: 'bg-success text-success-foreground',
  PENDING: 'bg-warning text-warning-foreground',
  NOT_STARTED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-destructive text-destructive-foreground',
};

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('__all__');
  const [bannedFilter, setBannedFilter] = useState('__all__');
  const [kycFilter, setKycFilter] = useState('__all__');
  const [banOpen, setBanOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; username: string } | null>(null);
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        const fetchedUsers = Array.isArray(response) ? response : [];
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    let results = [...users];
    if (search)
      results = results.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      );
    if (roleFilter !== '__all__') results = results.filter((u) => u.platformRole === roleFilter);
    if (bannedFilter !== '__all__')
      results = results.filter((u) => (bannedFilter === 'true' ? u.banned : !u.banned));
    if (kycFilter !== '__all__') results = results.filter((u) => u.kycStatus === kycFilter);
    return results;
  }, [search, roleFilter, bannedFilter, kycFilter, users]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} users
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or username..."
            className="pl-9 h-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="SUPPORT">Support</SelectItem>
            <SelectItem value="RESEARCHER">Researcher</SelectItem>
            <SelectItem value="ORG_MEMBER">Org Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bannedFilter} onValueChange={setBannedFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Ban Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">Banned</SelectItem>
            <SelectItem value="false">Active</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="KYC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All KYC</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-muted">
                          {u.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-sm">@{u.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${roleColors[u.platformRole]}`}>
                      {u.platformRole.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${kycColors[u.kycStatus]}`}>
                      {u.kycStatus.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.lastLogin).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info(`View ${u.username}`)}>
                          <Eye className="mr-2 h-3.5 w-3.5" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setBanTarget(u.id);
                            setBanOpen(true);
                          }}
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" /> {u.banned ? 'Unban' : 'Ban'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Change role for ${u.username}`)}>
                          <UserCog className="mr-2 h-3.5 w-3.5" /> Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Impersonating ${u.username}`)}>
                          <LogIn className="mr-2 h-3.5 w-3.5" /> Impersonate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setInviteTarget({ id: u.id, username: u.username });
                            setInviteOpen(true);
                          }}
                        >
                          <Building2 className="mr-2 h-3.5 w-3.5" /> Invite to Org
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

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              This will prevent the user from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Provide a reason for the ban..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!banReason}
              onClick={() => {
                toast.success('User banned');
                setBanOpen(false);
                setBanReason('');
              }}
            >
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInviteTarget(null);
            setInviteOrgId('');
            setInviteRole('VIEWER');
          }
          setInviteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {inviteTarget?.username} to an Organization</DialogTitle>
            <DialogDescription>
              Select an approved organization and role for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization ID</Label>
              <Input
                value={inviteOrgId}
                onChange={(e) => setInviteOrgId(e.target.value)}
                placeholder="org_xxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORG_ADMIN">ORG_ADMIN</SelectItem>
                  <SelectItem value="PROGRAM_MANAGER">PROGRAM_MANAGER</SelectItem>
                  <SelectItem value="REVIEWER">REVIEWER</SelectItem>
                  <SelectItem value="FINANCE">FINANCE</SelectItem>
                  <SelectItem value="VIEWER">VIEWER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                setInviteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (inviteTarget && inviteOrgId) {
                  try {
                    await api.inviteUserToOrg(inviteTarget.id, inviteOrgId, inviteRole);
                    toast.success('Invitation sent — user will see it in their notifications');
                    setInviteOpen(false);
                    setInviteTarget(null);
                    setInviteOrgId('');
                  } catch {
                    toast.error('Failed to send invitation');
                  }
                }
              }}
              disabled={!inviteOrgId}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
