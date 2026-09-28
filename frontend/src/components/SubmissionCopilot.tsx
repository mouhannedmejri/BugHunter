import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";

interface CopilotFeedbackItem {
  id: string;
  type: "WARNING" | "TIP" | "SECURITY_ALERT" | "QUALITY";
  title: string;
  message: string;
}

interface CopilotResult {
  completenessScore: number;
  readinessStatus: "NEEDS_WORK" | "GOOD" | "EXCELLENT";
  feedback: CopilotFeedbackItem[];
  detectedSecretsCount: number;
  suggestedMissingHeaders: string[];
}

interface SubmissionCopilotProps {
  title: string;
  reproSteps: string;
  impactExplanation: string;
  vulnCategory?: string;
  targetAsset?: string;
}

export function SubmissionCopilot({
  title,
  reproSteps,
  impactExplanation,
  vulnCategory,
  targetAsset,
}: SubmissionCopilotProps) {
  const [data, setData] = useState<CopilotResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      // Only query if user started drafting
      if (!title && !reproSteps && !impactExplanation) {
        setData(null);
        return;
      }

      setLoading(true);
      try {
        const res = await api.post<{ data: CopilotResult }>("/ai/submission-copilot", {
          title,
          reproSteps,
          impactExplanation,
          vulnCategory: vulnCategory || undefined,
          targetAsset: targetAsset || "",
        });
        setData(res.data.data);
      } catch (err) {
        // Fallback local heuristic check if server unreachable
        let score = 20;
        const feedback: CopilotFeedbackItem[] = [];
        if (title.length >= 10) score += 20;
        if (reproSteps.length >= 50) score += 30;
        if (impactExplanation.length >= 30) score += 30;

        setData({
          completenessScore: score,
          readinessStatus: score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : "NEEDS_WORK",
          feedback,
          detectedSecretsCount: 0,
          suggestedMissingHeaders: [],
        });
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [title, reproSteps, impactExplanation, vulnCategory, targetAsset]);

  if (!data && !loading) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 flex items-center gap-2.5 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>AI Submission Copilot</strong> will analyze your report draft in real-time to check reproduction clarity and alert you if credentials are leaked.
          </span>
        </CardContent>
      </Card>
    );
  }

  const score = data?.completenessScore ?? 0;
  const status = data?.readinessStatus ?? "NEEDS_WORK";
  const secretsCount = data?.detectedSecretsCount ?? 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.03] to-background overflow-hidden shadow-sm">
      <CardHeader className="p-3.5 pb-2 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Submission Quality Copilot
          </CardTitle>
          <Badge
            variant={
              status === "EXCELLENT"
                ? "default"
                : status === "GOOD"
                ? "secondary"
                : "outline"
            }
            className={`text-[10px] py-0 h-4 ${
              status === "EXCELLENT"
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : status === "GOOD"
                ? "bg-blue-600 text-white hover:bg-blue-600"
                : "border-amber-500/40 text-amber-600 dark:text-amber-400"
            }`}
          >
            {status === "EXCELLENT" ? "Ready to Submit" : status === "GOOD" ? "Good Quality" : "Needs More Detail"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3 text-xs">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Report Completeness</span>
            <span className="font-mono font-semibold">{score}%</span>
          </div>
          <Progress
            value={score}
            className={`h-1.5 ${
              score >= 80
                ? "[&>div]:bg-emerald-500"
                : score >= 60
                ? "[&>div]:bg-blue-500"
                : "[&>div]:bg-amber-500"
            }`}
          />
        </div>

        {/* Leaked Secrets Alert */}
        {secretsCount > 0 && (
          <div className="p-2.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-[11px] flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sensitive Credentials Detected ({secretsCount})</p>
              <p className="text-destructive/90 text-[10px] mt-0.5">
                Remove live tokens, API keys, or passwords. Use placeholders like <code>[REDACTED_TOKEN]</code>.
              </p>
            </div>
          </div>
        )}

        {/* Feedback Tips */}
        {data && data.feedback.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recommendations
            </p>
            <div className="space-y-1.5">
              {data.feedback.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-[11px] leading-relaxed"
                >
                  {item.type === "SECURITY_ALERT" ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  ) : item.type === "WARNING" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-medium text-foreground">{item.title}: </span>
                    <span className="text-muted-foreground">{item.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.feedback.length === 0 && score >= 80 && secretsCount === 0 && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium pt-1">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Outstanding report structure! All prerequisites and impact points are detailed.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
