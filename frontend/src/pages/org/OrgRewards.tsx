import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SeverityBadge } from "@/components/SeverityBadge";
import { DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";
import type { Severity } from "@/lib/mock-data";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { useParams } from "react-router-dom";

type PayoutStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

type ApiReward = {
  id: string;
  amountUsd: number;
  bonusUsd: number;
  decision: string;
  report: { id: string; title: string; severityValidated: Severity | null; status: string };
  payout: {
    id: string;
    status: PayoutStatus;
    amountUsd: number;
  } | null;
  recipient: { username: string; displayName: string | null };
};

const tabs: { value: PayoutStatus; label: string }[] = [
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Rejected" },
];

const statusColors: Record<PayoutStatus, string> = {
  PENDING_APPROVAL: "bg-warning text-warning-foreground",
  APPROVED: "bg-primary text-primary-foreground",
  PROCESSING: "bg-secondary text-secondary-foreground",
  COMPLETED: "bg-success text-success-foreground",
  FAILED: "bg-destructive text-destructive-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

function tabForReward(r: ApiReward): PayoutStatus {
  if (r.payout) return r.payout.status;
  if (r.decision === "NO_REWARD") return "CANCELLED";
  return "PENDING_APPROVAL";
}

const OrgRewards = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PayoutStatus>("PENDING_APPROVAL");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<ApiReward | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    data: rewards = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["orgRewards", orgSlug],
    queryFn: () => api.get<ApiReward[]>(apiPaths.organizations.rewards(orgSlug!)),
    enabled: !!orgSlug,
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ["orgRewardsStats", orgSlug],
    queryFn: () => api.get<{ monthlyBreakdown: Record<string, number> }>(apiPaths.organizations.rewardsStats(orgSlug!)),
    enabled: !!orgSlug && !isError,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: (rewardId: string) => api.post(apiPaths.rewards.approve(rewardId)),
    onSuccess: () => {
      toast.success("Reward approved");
      setApproveOpen(false);
      setSelectedReward(null);
      void queryClient.invalidateQueries({ queryKey: ["orgRewards", orgSlug] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ rewardId, reason }: { rewardId: string; reason: string }) =>
      api.post(apiPaths.rewards.reject(rewardId), { reason }),
    onSuccess: () => {
      toast.success("Payout rejected");
      setRejectOpen(false);
      setRejectReason("");
      setSelectedReward(null);
      void queryClient.invalidateQueries({ queryKey: ["orgRewards", orgSlug] });
    },
  });

  const monthKey = new Date().toISOString().slice(0, 7);
  const paidThisMonthCents = stats?.monthlyBreakdown?.[monthKey] ?? 0;

  const pending = rewards.filter((r) => tabForReward(r) === "PENDING_APPROVAL");
  const pendingAmount = pending.reduce((sum, r) => sum + r.amountUsd + r.bonusUsd, 0);

  const filtered = rewards.filter((r) => tabForReward(r) === activeTab);

  const openApprove = (reward: ApiReward) => {
    setSelectedReward(reward);
    setApproveOpen(true);
  };

  const openReject = (reward: ApiReward) => {
    setSelectedReward(reward);
    setRejectOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
        <p className="mt-4 text-muted-foreground">
          {(error as { message?: string })?.message ??
            "You need Finance or Org Admin access to view organization rewards."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
        {selectedIds.length > 0 && activeTab === "PENDING_APPROVAL" && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={approveMutation.isPending}
            onClick={() => {
              void Promise.all(selectedIds.map((id) => api.post(apiPaths.rewards.approve(id)))).then(() => {
                toast.success(`Approved ${selectedIds.length} reward(s)`);
                setSelectedIds([]);
                void queryClient.invalidateQueries({ queryKey: ["orgRewards", orgSlug] });
              });
            }}
          >
            <CheckCircle className="h-3.5 w-3.5" /> Bulk Approve ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-success mb-2" />
            <p className="text-2xl font-bold">{formatCurrency(paidThisMonthCents)}</p>
            <p className="text-xs text-muted-foreground">Paid this month (decisions)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-warning mb-2" />
            <p className="text-2xl font-bold">{formatCurrency(pendingAmount)}</p>
            <p className="text-xs text-muted-foreground">Pending amount (cents)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending approvals</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as PayoutStatus);
          setSelectedIds([]);
        }}
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {rewards.filter((r) => tabForReward(r) === t.value).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No rewards in this category.</div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {t.value === "PENDING_APPROVAL" && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedIds.length === filtered.length && filtered.length > 0}
                            onCheckedChange={() =>
                              setSelectedIds((prev) =>
                                prev.length === filtered.length ? [] : filtered.map((r) => r.id),
                              )
                            }
                          />
                        </TableHead>
                      )}
                      <TableHead>Report</TableHead>
                      <TableHead>Researcher</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Recommended</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                      <TableHead>Status</TableHead>
                      {t.value === "PENDING_APPROVAL" && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards
                      .filter((r) => tabForReward(r) === t.value)
                      .map((r) => {
                        const st = tabForReward(r);
                        const payoutAmt = r.payout?.amountUsd ?? r.amountUsd + r.bonusUsd;
                        return (
                          <TableRow key={r.id}>
                            {t.value === "PENDING_APPROVAL" && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.includes(r.id)}
                                  onCheckedChange={() =>
                                    setSelectedIds((prev) =>
                                      prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id],
                                    )
                                  }
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">
                              {r.report.title}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              @{r.recipient.username}
                            </TableCell>
                            <TableCell>
                              <SeverityBadge severity={r.report.severityValidated ?? "MEDIUM"} />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(r.amountUsd + r.bonusUsd)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {r.payout ? formatCurrency(payoutAmt) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusColors[st]}`}>{st.replace(/_/g, " ")}</Badge>
                            </TableCell>
                            {t.value === "PENDING_APPROVAL" && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    disabled={approveMutation.isPending}
                                    onClick={() => openApprove(r)}
                                  >
                                    <CheckCircle className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-destructive"
                                    onClick={() => openReject(r)}
                                  >
                                    <XCircle className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve payout</DialogTitle>
            <DialogDescription>
              This approves the pending payout amount already on the reward. To change the amount, update the reward
              decision on the report first.
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{selectedReward.report.title}</p>
              <p className="text-muted-foreground">
                Amount:{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(
                    selectedReward.payout?.amountUsd ?? selectedReward.amountUsd + selectedReward.bonusUsd,
                  )}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedReward || approveMutation.isPending}
              onClick={() => selectedReward && approveMutation.mutate(selectedReward.id)}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payout</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this reward payout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium">{selectedReward?.report.title}</p>
            <div className="space-y-2">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || !selectedReward || rejectMutation.isPending}
              onClick={() =>
                selectedReward &&
                rejectMutation.mutate({ rewardId: selectedReward.id, reason: rejectReason.trim() })
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgRewards;
