import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Severity } from "@/lib/mock-data";

export interface AiAssessmentData {
  id: string;
  reportId: string;
  predictedSeverity: Severity;
  cvssVector: string;
  cvssScore: number;
  cweId: string | null;
  cweName: string | null;
  reasoning: string;
  scopeStatus: "IN_SCOPE" | "OUT_OF_SCOPE" | "UNCERTAIN";
  scopeRationale: string | null;
  remediationNotes: string | null;
  duplicateCandidateId: string | null;
  duplicateSimilarity: number | null;
  duplicateRationale: string | null;
  status: string;
}

interface AiTriagePanelProps {
  reportId: string;
  onApplySeverity?: (severity: Severity, cvss: number) => void;
  onMarkDuplicate?: (candidateId: string) => void;
}

export function AiTriagePanel({
  reportId,
  onApplySeverity,
  onMarkDuplicate,
}: AiTriagePanelProps) {
  const queryClient = useQueryClient();
  const [copiedVector, setCopiedVector] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);

  const { data: assessment, isLoading, isError, refetch } = useQuery<AiAssessmentData>({
    queryKey: ["report-ai-assessment", reportId],
    queryFn: async () => {
      const res = await api.get<{ data: AiAssessmentData }>(`/reports/${reportId}/ai-assessment`);
      return res.data.data;
    },
    enabled: !!reportId,
  });

  const rerunMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: AiAssessmentData }>(`/reports/${reportId}/ai-assessment/rerun`, {});
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["report-ai-assessment", reportId], data);
      toast.success("AI Triage re-evaluated successfully");
    },
    onError: () => {
      toast.error("Failed to rerun AI triage");
    },
  });

  const handleCopyVector = () => {
    if (!assessment?.cvssVector) return;
    navigator.clipboard.writeText(assessment.cvssVector);
    setCopiedVector(true);
    toast.success("CVSS 3.1 vector copied to clipboard");
    setTimeout(() => setCopiedVector(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Generating AI Triage & CVSS evaluation...</span>
        </CardContent>
      </Card>
    );
  }

  if (isError || !assessment) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>AI Triage not available for this report.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
          >
            Run AI Triage
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.04] to-background shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-primary/10 bg-primary/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                AI Copilot & RAG Triage
                <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary">
                  CVSS 3.1
                </Badge>
              </CardTitle>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
            title="Re-run AI Analysis"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rerunMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* CVSS & Severity Suggestion */}
        <div className="bg-background/80 rounded-lg p-3 border space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Estimated CVSS:</span>
              <span className="text-base font-bold font-mono text-foreground">
                {assessment.cvssScore.toFixed(1)}
              </span>
              <SeverityBadge severity={assessment.predictedSeverity} />
            </div>
            {onApplySeverity && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs gap-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                onClick={() => onApplySeverity(assessment.predictedSeverity, assessment.cvssScore)}
              >
                Apply Severity
              </Button>
            )}
          </div>

          {/* CVSS Vector */}
          <div className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1 font-mono text-[11px] text-muted-foreground break-all">
            <span>{assessment.cvssVector}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={handleCopyVector}
            >
              {copiedVector ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>

          {/* Reasoning */}
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            {assessment.reasoning}
          </p>
        </div>

        {/* Scope Verification */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background/50">
          {assessment.scopeStatus === "IN_SCOPE" && (
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          )}
          {assessment.scopeStatus === "OUT_OF_SCOPE" && (
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          )}
          {assessment.scopeStatus === "UNCERTAIN" && (
            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span>Scope Status:</span>
              <Badge
                variant={
                  assessment.scopeStatus === "IN_SCOPE"
                    ? "default"
                    : assessment.scopeStatus === "OUT_OF_SCOPE"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px] py-0 h-4"
              >
                {assessment.scopeStatus}
              </Badge>
            </div>
            {assessment.scopeRationale && (
              <p className="text-muted-foreground text-[11px]">{assessment.scopeRationale}</p>
            )}
          </div>
        </div>

        {/* Duplicate Alert (if detected) */}
        {assessment.duplicateCandidateId && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Semantic Duplicate Warning
              </span>
              {assessment.duplicateSimilarity && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {Math.round(assessment.duplicateSimilarity * 100)}% match
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {assessment.duplicateRationale || `High similarity detected with report #${assessment.duplicateCandidateId}`}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {onMarkDuplicate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] border-amber-500/30 hover:bg-amber-500/20"
                  onClick={() => onMarkDuplicate(assessment.duplicateCandidateId!)}
                >
                  Link as Duplicate
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Remediation Guide (Collapsible) */}
        {assessment.remediationNotes && (
          <div className="rounded-lg border bg-background/50 overflow-hidden">
            <button
              type="button"
              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors font-medium text-[11px]"
              onClick={() => setShowRemediation((prev) => !prev)}
            >
              <span className="flex items-center gap-1.5 text-foreground">
                <Code2 className="h-3.5 w-3.5 text-primary" />
                Remediation Guidance & Secure Patch
              </span>
              {showRemediation ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showRemediation && (
              <div className="p-3 pt-0 border-t bg-muted/20 text-muted-foreground font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                {assessment.remediationNotes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
