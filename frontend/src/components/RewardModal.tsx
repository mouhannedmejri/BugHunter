import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/mock-data";
import { toast } from "sonner";

interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  severity: Severity;
  suggestedMin: number;
  suggestedMax: number;
  onSubmit: (amount: number, notes: string) => void;
}

export const RewardModal = ({ open, onOpenChange, reportTitle, severity, suggestedMin, suggestedMax, onSubmit }: RewardModalProps) => {
  const [amount, setAmount] = useState(suggestedMin / 100);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit(amount * 100, notes);
    toast.success(`Reward of $${amount} created`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reward</DialogTitle>
          <DialogDescription>Set the reward amount for this report.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">{reportTitle}</p>
            <div className="mt-1"><SeverityBadge severity={severity} /></div>
          </div>
          <div className="text-xs text-muted-foreground">
            Suggested range: ${suggestedMin / 100} — ${suggestedMax / 100}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Amount (USD)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Justification for reward amount..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Reward</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
