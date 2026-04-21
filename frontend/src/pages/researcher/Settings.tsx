import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Shield, Bell, DollarSign, Key, Monitor, Smartphone, Copy, Eye, EyeOff, Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// ── Profile Tab ──────────────────────────────────────
const ProfileTab = ({ profile }: { profile: any }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    twitterHandle: profile?.twitterHandle || "",
    githubHandle: profile?.githubHandle || "",
    country: profile?.country || "US",
    timezone: profile?.timezone || "America/New_York",
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(apiPaths.users.me, formData),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Avatar</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {profile?.displayName?.[0] || profile?.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Display Name</Label>
              <Input value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} />
            </div>
            <div><Label>Username</Label>
              <Input value={profile?.username || ""} disabled className="opacity-60" />
            </div>
          </div>
          <div><Label>Bio</Label>
            <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Website</Label>
              <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
            </div>
            <div><Label>Twitter</Label>
              <Input value={formData.twitterHandle} onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })} />
            </div>
            <div><Label>GitHub</Label>
              <Input value={formData.githubHandle} onChange={(e) => setFormData({ ...formData, githubHandle: e.target.value })} />
            </div>
            <div><Label>Country</Label>
              <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                  <SelectItem value="IN">🇮🇳 India</SelectItem>
                  <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Timezone</Label>
              <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern (UTC-5)</SelectItem>
                  <SelectItem value="America/Chicago">Central (UTC-6)</SelectItem>
                  <SelectItem value="America/Denver">Mountain (UTC-7)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (UTC-8)</SelectItem>
                  <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                  <SelectItem value="Europe/Berlin">Berlin (UTC+1)</SelectItem>
                  <SelectItem value="Asia/Kolkata">India (UTC+5:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Security Tab ──────────────────────────────────────
const SecurityTab = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => api.get<any[]>(apiPaths.auth.sessions),
  });

  const { data: loginHistory = [] } = useQuery({
    queryKey: ["auth", "loginHistory"],
    queryFn: () => api.get<any[]>(apiPaths.auth.loginHistory),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div><Label>Current Password</Label><Input type="password" /></div>
          <div><Label>New Password</Label><Input type={showPassword ? "text" : "password"} /></div>
          <div><Label>Confirm Password</Label><Input type="password" /></div>
          <Button onClick={() => toast.success("Password updated")}>Update Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
            <Badge variant={twoFaEnabled ? "default" : "secondary"}>{twoFaEnabled ? "Enabled" : "Disabled"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFaEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
              <div className="border border-border rounded-lg p-6 flex flex-col items-center gap-3 bg-muted/30">
                <div className="h-32 w-32 bg-foreground/10 rounded-lg flex items-center justify-center text-muted-foreground text-xs">QR Code</div>
                <p className="text-xs text-muted-foreground">Scan with your authenticator app</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">JBSWY3DPEHPK3PXP</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.success("Copied")}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="max-w-xs">
                <Label>Verification Code</Label>
                <Input placeholder="Enter 6-digit code" maxLength={6} />
              </div>
              <Button onClick={() => { setTwoFaEnabled(true); toast.success("2FA enabled"); }}>Enable 2FA</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">2FA is currently active.</p>
              <div>
                <p className="text-sm font-medium mb-2">Backup Codes</p>
                <div className="grid grid-cols-2 gap-1 max-w-xs">
                  {["a1b2c3d4", "e5f6g7h8", "i9j0k1l2", "m3n4o5p6", "q7r8s9t0", "u1v2w3x4"].map((c) => (
                    <code key={c} className="text-xs bg-muted px-2 py-1 rounded font-mono text-center">{c}</code>
                  ))}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => { setTwoFaEnabled(false); toast.info("2FA disabled"); }}>Disable 2FA</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Sessions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">No active sessions found.</p>}
            {sessions.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {s.deviceInfo?.userAgent?.includes("iPhone") ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.deviceInfo?.userAgent || "Unknown Device"} {s.current && <Badge variant="secondary" className="ml-2 text-[10px]">Current</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{s.deviceInfo?.ip || "Unknown IP"} · {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {!s.current && <Button variant="ghost" size="sm" className="text-destructive">Revoke</Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Login History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Device</TableHead><TableHead>IP</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {loginHistory.map((l: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{l.userAgent || "Unknown"}</TableCell>
                  <TableCell className="text-sm font-mono">{l.ip}</TableCell>
                  <TableCell><Badge variant={l.success ? "default" : "destructive"} className="text-[10px]">{l.success ? "Success" : "Failed"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Notifications Tab ──────────────────────────────────
const NotificationsTab = () => {
  const types = [
    "Report status changed", "New comment on report", "Reward issued",
    "Program update", "Invitation received", "SLA warning",
  ];
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; inApp: boolean }>>(
    Object.fromEntries(types.map((t) => [t, { email: true, inApp: true }]))
  );
  const [digest, setDigest] = useState("instant");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Event</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t}>
                  <TableCell className="text-sm">{t}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={prefs[t]?.email} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t]: { ...p[t], email: v } }))} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={prefs[t]?.inApp} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t]: { ...p[t], inApp: v } }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Email Digest</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={digest} onValueChange={setDigest} className="space-y-2">
            {[
              { value: "instant", label: "Instant", desc: "Receive emails immediately" },
              { value: "hourly", label: "Hourly", desc: "Batch notifications every hour" },
              { value: "daily", label: "Daily", desc: "One digest per day" },
            ].map((o) => (
              <div key={o.value} className="flex items-start gap-3">
                <RadioGroupItem value={o.value} id={`digest-${o.value}`} />
                <Label htmlFor={`digest-${o.value}`} className="cursor-pointer">
                  <span className="text-sm font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button className="mt-4" onClick={() => toast.success("Preferences saved")}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Payout Tab ──────────────────────────────────────
const PayoutTab = () => {
  const [method, setMethod] = useState("bank");
  const payments = [
    { date: "2026-04-01", amount: 250000, method: "Bank Transfer", status: "COMPLETED" },
    { date: "2026-03-15", amount: 80000, method: "PayPal", status: "COMPLETED" },
    { date: "2026-03-01", amount: 500000, method: "Bank Transfer", status: "PROCESSING" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Badge className="bg-warning text-warning-foreground">KYC Pending</Badge>
          <p className="text-sm text-foreground">Complete identity verification to receive payouts.</p>
          <Button size="sm" variant="outline" className="ml-auto">Verify Now</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Legal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div><Label>Legal Name</Label><Input defaultValue="John Doe" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Country</Label><Input defaultValue="United States" /></div>
            <div><Label>Tax ID</Label><Input placeholder="SSN / Tax ID" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment Method</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={method} onValueChange={setMethod} className="flex gap-4">
            {[
              { value: "bank", label: "Bank Transfer" },
              { value: "paypal", label: "PayPal" },
              { value: "crypto", label: "Cryptocurrency" },
            ].map((m) => (
              <div key={m.value} className="flex items-center gap-2">
                <RadioGroupItem value={m.value} id={`pm-${m.value}`} />
                <Label htmlFor={`pm-${m.value}`} className="cursor-pointer text-sm">{m.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="max-w-lg space-y-3">
            {method === "bank" && (
              <>
                <div><Label>Bank Name</Label><Input placeholder="Bank of America" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Account Number</Label><Input placeholder="••••1234" /></div>
                  <div><Label>Routing Number</Label><Input placeholder="021000021" /></div>
                </div>
              </>
            )}
            {method === "paypal" && (
              <div><Label>PayPal Email</Label><Input type="email" placeholder="you@example.com" /></div>
            )}
            {method === "crypto" && (
              <>
                <div><Label>Wallet Address</Label><Input placeholder="0x..." /></div>
                <div><Label>Chain</Label>
                  <Select defaultValue="ethereum">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="solana">Solana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <Button onClick={() => toast.success("Payment method saved")}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm font-medium">${(p.amount / 100).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{p.method}</TableCell>
                  <TableCell><Badge variant={p.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ── API Keys Tab ──────────────────────────────────────
const ApiKeysTab = () => {
  const [keys, setKeys] = useState([
    { id: "k1", name: "CI Pipeline", prefix: "bh_live_abc1", scopes: ["reports:read", "programs:read"], created: "2026-03-01", lastUsed: "2026-04-09" },
    { id: "k2", name: "Automation Bot", prefix: "bh_live_xyz9", scopes: ["reports:write", "reports:read"], created: "2026-01-15", lastUsed: "2026-04-05" },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const allScopes = ["reports:read", "reports:write", "programs:read", "programs:write", "profile:read"];

  const createKey = () => {
    const key = `bh_live_${Math.random().toString(36).slice(2, 14)}`;
    setNewKey(key);
    setKeys((prev) => [...prev, { id: `k${prev.length + 1}`, name: newName || "Unnamed", prefix: key.slice(0, 14), scopes: newScopes, created: new Date().toISOString().slice(0, 10), lastUsed: "Never" }]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">API Keys</CardTitle>
            <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) { setNewKey(null); setNewName(""); setNewScopes([]); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Create Key</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{newKey ? "Your API Key" : "Create API Key"}</DialogTitle><DialogDescription>{newKey ? "Copy this key now — it won't be shown again." : "Give your key a name and select permissions."}</DialogDescription></DialogHeader>
                {!newKey ? (
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My integration" /></div>
                    <div>
                      <Label>Scopes</Label>
                      <div className="space-y-2 mt-2">
                        {allScopes.map((s) => (
                          <div key={s} className="flex items-center gap-2">
                            <Checkbox checked={newScopes.includes(s)} onCheckedChange={(c) => setNewScopes(c ? [...newScopes, s] : newScopes.filter((x) => x !== s))} id={`scope-${s}`} />
                            <Label htmlFor={`scope-${s}`} className="text-sm font-mono cursor-pointer">{s}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter><Button onClick={createKey} disabled={!newName}>Create</Button></DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="text-sm font-mono flex-1 break-all">{newKey}</code>
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-destructive font-medium">⚠ This key will only be shown once. Store it securely.</p>
                    <DialogFooter><Button onClick={() => setShowModal(false)}>Done</Button></DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Scopes</TableHead><TableHead>Created</TableHead><TableHead>Last Used</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="text-sm font-medium">{k.name}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{k.prefix}••••</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex gap-1 flex-wrap">{k.scopes.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
                  </TableCell>
                  <TableCell className="text-sm">{k.created}</TableCell>
                  <TableCell className="text-sm">{k.lastUsed}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setKeys((prev) => prev.filter((x) => x.id !== k.id)); toast.info("Key revoked"); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Main Settings Page ──────────────────────────────────
const Settings = () => {
  const { data: me, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.get<{ profile: any }>(apiPaths.users.me),
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-sm mb-6" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile"><Upload className="mr-1.5 h-3.5 w-3.5" /> Profile</TabsTrigger>
            <TabsTrigger value="security"><Shield className="mr-1.5 h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="payout"><DollarSign className="mr-1.5 h-3.5 w-3.5" /> Payout</TabsTrigger>
            <TabsTrigger value="api-keys"><Key className="mr-1.5 h-3.5 w-3.5" /> API Keys</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab profile={me?.profile} /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="payout"><PayoutTab /></TabsContent>
          <TabsContent value="api-keys"><ApiKeysTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Settings;
