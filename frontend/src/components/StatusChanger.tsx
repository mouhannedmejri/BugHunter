import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportStatus } from "@/lib/mock-data";
import { toast } from "sonner";

const transitions: Record<string, ReportStatus[]> = {
  SUBMITTED: ["RECEIVED", "NEEDS_INFO", "DUPLICATE", "OUT_OF_SCOPE"],
  RECEIVED: ["TRIAGING", "NEEDS_INFO", "DUPLICATE", "OUT_OF_SCOPE"],
  NEEDS_INFO: ["TRIAGING", "CLOSED"],
  TRIAGING: ["ACCEPTED", "NOT_APPLICABLE", "INFORMATIVE", "DUPLICATE", "OUT_OF_SCOPE"],
  ACCEPTED: ["RESOLVED", "ESCALATED"],
  RESOLVED: ["REWARDED", "CLOSED"],
  REWARDED: ["CLOSED"],
  ESCALATED: ["ACCEPTED", "RESOLVED"],
};

interface StatusChangerProps {
  currentStatus: ReportStatus;
  onChanged: (status: ReportStatus, reason?: string) => void;
}

export const StatusChanger = ({ currentStatus, onChanged }: StatusChangerProps) => {
  const [selected, setSelected] = useState<ReportStatus | "">("");
  const validNext = transitions[currentStatus] || [];

  const handleSave = () => {
    if (!selected) return;
    let reason: string | undefined;
    if (selected === "CLOSED") {
      reason = window.prompt("Reason for closing (required)")?.trim() ?? "";
      if (!reason) {
        toast.error("A reason is required to close this report");
        return;
      }
    }
    onChanged(selected as ReportStatus, reason);
    toast.success(`Status updated to ${selected}`);
    setSelected("");
  };

  if (validNext.length === 0) return (
    <p className="text-xs text-muted-foreground">No status transitions available.</p>
  );

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Status</label>
      <div className="flex gap-2">
        <Select value={selected} onValueChange={(v) => setSelected(v as ReportStatus)}>
          <SelectTrigger className="h-9 text-sm flex-1">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {validNext.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={handleSave} disabled={!selected}>
          Save
        </Button>
      </div>
    </div>
  );
};
