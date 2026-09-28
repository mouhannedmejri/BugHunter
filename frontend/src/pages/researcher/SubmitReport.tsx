import { useEffect, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StepIndicator } from "@/components/StepIndicator";
import { MDEditor } from "@/components/MDEditor";
import { FileUploadZone } from "@/components/FileUploadZone";
import { SeverityBadge } from "@/components/SeverityBadge";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SubmissionCopilot } from "@/components/SubmissionCopilot";
import { useReportDraftStore } from "@/stores/report-draft-store";
import { vulnerabilityCategories } from "@/lib/report-mock-data";
import { mockPrograms, type Severity } from "@/lib/mock-data";
import { ArrowLeft, ArrowRight, Save, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";

const steps = ["Basics", "Details", "Evidence", "Review"];

const severities: { value: Severity; color: string }[] = [
  { value: "CRITICAL", color: "bg-destructive" },
  { value: "HIGH", color: "bg-orange-500" },
  { value: "MEDIUM", color: "bg-warning" },
  { value: "LOW", color: "bg-muted-foreground" },
  { value: "INFORMATIONAL", color: "bg-muted-foreground/50" },
];

export default function SubmitReport() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);

  const { draft, currentStep, hasSavedDraft, setField, setStep, addAttachment, removeAttachment, updateAttachmentProgress, clearDraft, initDraft } = useReportDraftStore();

  const { data: programRes } = useQuery({
    queryKey: ['program', slug],
    queryFn: () => api.get<any>(apiPaths.programs.bySlug(slug!)),
    enabled: !!slug
  });

  const program = programRes?.program || mockPrograms.find((p) => p.slug === slug);
  const assets = programRes?.assets || program?.assets || [];

  useEffect(() => {
    if (!slug) return;
    const store = useReportDraftStore.getState();
    if (store.hasSavedDraft && store.draft.programSlug === slug) {
      setShowDraftRestore(true);
    } else {
      initDraft(slug);
    }
  }, [slug, initDraft]);

  // Autosave every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (draft.title) {
        // In production: PUT /reports/:id
        console.log("[autosave] draft saved");
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [draft]);

  const handleFiles = useCallback(
    (files: File[]) => {
      files.forEach((f) => {
        const id = crypto.randomUUID();
        addAttachment({ id, name: f.name, size: f.size, type: f.type });
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          updateAttachmentProgress(id, Math.min(100, Math.round(progress)));
        }, 500);
      });
    },
    [addAttachment, updateAttachmentProgress]
  );

  const canNext = () => {
    if (currentStep === 0) return !!draft.title && draft.title.length >= 5 && !!draft.category && !!draft.severity && !!draft.affectedAssetId;
    if (currentStep === 1) return !!draft.reproductionSteps && draft.reproductionSteps.length >= 20 && !!draft.impact && draft.impact.length >= 10;
    return true;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post<any>(apiPaths.reports.create, {
        programId: program!.id,
        assetId: draft.affectedAssetId,
        title: draft.title,
        vulnCategory: draft.category,
        severityEstimate: draft.severity,
        reproSteps: draft.reproductionSteps,
        impactExplanation: draft.impact,
        environmentInfo: {
          os: draft.environmentOs,
          browser: draft.environmentBrowser
        },
        suggestedFix: draft.remediation
      });
    },
    onSuccess: () => {
      toast({ title: "Report submitted!", description: "Your vulnerability report has been submitted for review." });
      clearDraft();
      navigate(`/programs/${slug}`);
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message || "Failed to submit report.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  if (!program) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Program not found.</p>
        <Button variant="link" onClick={() => navigate("/programs")}>Back to programs</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Draft restore dialog */}
      <Dialog open={showDraftRestore} onOpenChange={setShowDraftRestore}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Draft?</DialogTitle>
            <DialogDescription>
              You have a saved draft for this program. Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { clearDraft(); initDraft(slug!); setShowDraftRestore(false); }}>
              Start Fresh
            </Button>
            <Button onClick={() => setShowDraftRestore(false)}>Restore Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground" onClick={() => navigate(`/programs/${slug}`)}>
          <ArrowLeft className="h-4 w-4" /> {program.title}
        </Button>
        <h1 className="text-xl font-bold text-foreground">Submit Vulnerability Report</h1>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Step 0: Basics */}
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g., Stored XSS in user profile bio"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Vulnerability Category <span className="text-destructive">*</span></Label>
                <Select value={draft.category} onValueChange={(v) => setField("category", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {vulnerabilityCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Severity Estimate <span className="text-destructive">*</span></Label>
                <RadioGroup
                  value={draft.severity}
                  onValueChange={(v) => setField("severity", v as Severity)}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-2"
                >
                  {severities.map((s) => (
                    <div key={s.value}>
                      <RadioGroupItem value={s.value} id={`sev-${s.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`sev-${s.value}`}
                        className={cn(
                          "flex items-center gap-2 rounded-md border border-input px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        )}
                      >
                        <div className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                        <span className="text-xs font-medium">{s.value}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Affected Asset <span className="text-destructive">*</span></Label>
                <Select value={draft.affectedAssetId} onValueChange={(v) => setField("affectedAssetId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.filter((a: any) => a.inScope).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">[{a.type}]</span> {a.identifier}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 1: Details */}
          {currentStep === 1 && (
            <>
              <MDEditor
                label="Reproduction Steps"
                required
                value={draft.reproductionSteps}
                onChange={(v) => setField("reproductionSteps", v)}
                placeholder="1. Navigate to...\n2. Enter the payload...\n3. Observe that..."
              />
              <MDEditor
                label="Impact Explanation"
                required
                value={draft.impact}
                onChange={(v) => setField("impact", v)}
                placeholder="Describe the security impact and affected users..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operating System</Label>
                  <Input
                    value={draft.environmentOs}
                    onChange={(e) => setField("environmentOs", e.target.value)}
                    placeholder="e.g., macOS 14.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Browser / App Version</Label>
                  <Input
                    value={draft.environmentBrowser}
                    onChange={(e) => setField("environmentBrowser", e.target.value)}
                    placeholder="e.g., Chrome 122"
                  />
                </div>
              </div>
              <MDEditor
                label="Suggested Remediation"
                value={draft.remediation}
                onChange={(v) => setField("remediation", v)}
                placeholder="Suggest a fix (optional)..."
                minRows={4}
              />

              {/* AI Submission Quality Copilot — live feedback as the researcher types */}
              <SubmissionCopilot
                title={draft.title}
                reproSteps={draft.reproductionSteps}
                impactExplanation={draft.impact}
                vulnCategory={draft.category}
                targetAsset={assets.find((a: any) => a.id === draft.affectedAssetId)?.identifier || ""}
              />
            </>
          )}

          {/* Step 2: Evidence */}
          {currentStep === 2 && (
            <FileUploadZone
              files={draft.attachments}
              onFiles={handleFiles}
              onRemove={removeAttachment}
            />
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Title</span>
                  <p className="font-medium text-foreground">{draft.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium text-foreground">{vulnerabilityCategories.find((c) => c.value === draft.category)?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity</span>
                  <p>{draft.severity && <SeverityBadge severity={draft.severity as Severity} />}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Asset</span>
                  <p className="font-medium text-foreground font-mono text-xs">
                    {assets.find((a: any) => a.id === draft.affectedAssetId)?.identifier}
                  </p>
                </div>
              </div>

              {draft.reproductionSteps && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Reproduction Steps</h4>
                  <div className="rounded-md border border-border p-3 bg-muted/20">
                    <MarkdownContent body={draft.reproductionSteps} />
                  </div>
                </div>
              )}
              {draft.impact && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Impact</h4>
                  <div className="rounded-md border border-border p-3 bg-muted/20">
                    <MarkdownContent body={draft.impact} />
                  </div>
                </div>
              )}
              {draft.remediation && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Remediation</h4>
                  <div className="rounded-md border border-border p-3 bg-muted/20">
                    <MarkdownContent body={draft.remediation} />
                  </div>
                </div>
              )}
              {draft.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Attachments ({draft.attachments.length})</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5">
                    {draft.attachments.map((a) => (
                      <li key={a.id}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex gap-2">
          {currentStep === 3 && (
            <>
              <Button variant="outline" className="gap-1" onClick={() => { toast({ title: "Draft saved" }); }}>
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button className="gap-1" onClick={() => setShowConfirm(true)}>
                <Send className="h-4 w-4" /> Submit Report
              </Button>
            </>
          )}
          {currentStep < 3 && (
            <Button onClick={() => setStep(currentStep + 1)} disabled={!canNext()} className="gap-1">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Confirm Submission
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>By submitting this report, you confirm that:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>You discovered this vulnerability through authorized testing</li>
              <li>You have not disclosed this vulnerability to any third party</li>
              <li>You agree to the program's responsible disclosure policy</li>
              <li>All information provided is accurate to the best of your knowledge</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitMutation.isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
