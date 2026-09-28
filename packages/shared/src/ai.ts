import { z } from 'zod';
import { Severity, VulnCategory } from './enums.js';

// ─── AI Triage Assessment Types & Schemas ─────────────────────

export const AiAssessmentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type AiAssessmentStatus = (typeof AiAssessmentStatus)[keyof typeof AiAssessmentStatus];

export const ScopeVerificationStatus = {
  IN_SCOPE: 'IN_SCOPE',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  UNCERTAIN: 'UNCERTAIN',
} as const;
export type ScopeVerificationStatus = (typeof ScopeVerificationStatus)[keyof typeof ScopeVerificationStatus];

// ─── CVSS 3.1 Metrics ─────────────────────────────────────────

export const AttackVector = {
  NETWORK: 'N',
  ADJACENT: 'A',
  LOCAL: 'L',
  PHYSICAL: 'P',
} as const;
export type AttackVector = (typeof AttackVector)[keyof typeof AttackVector];

export const AttackComplexity = {
  LOW: 'L',
  HIGH: 'H',
} as const;
export type AttackComplexity = (typeof AttackComplexity)[keyof typeof AttackComplexity];

export const PrivilegesRequired = {
  NONE: 'N',
  LOW: 'L',
  HIGH: 'H',
} as const;
export type PrivilegesRequired = (typeof PrivilegesRequired)[keyof typeof PrivilegesRequired];

export const UserInteraction = {
  NONE: 'N',
  REQUIRED: 'R',
} as const;
export type UserInteraction = (typeof UserInteraction)[keyof typeof UserInteraction];

export const ScopeMetric = {
  UNCHANGED: 'U',
  CHANGED: 'C',
} as const;
export type ScopeMetric = (typeof ScopeMetric)[keyof typeof ScopeMetric];

export const CiaImpact = {
  NONE: 'N',
  LOW: 'L',
  HIGH: 'H',
} as const;
export type CiaImpact = (typeof CiaImpact)[keyof typeof CiaImpact];

export interface Cvss31Metrics {
  av: AttackVector;
  ac: AttackComplexity;
  pr: PrivilegesRequired;
  ui: UserInteraction;
  s: ScopeMetric;
  c: CiaImpact;
  i: CiaImpact;
  a: CiaImpact;
}

/**
 * Standard CVSS v3.1 Base Score Calculator following the FIRST.org specification.
 */
export function calculateCvss31BaseScore(metrics: Cvss31Metrics): {
  baseScore: number;
  severity: Severity;
  vectorString: string;
} {
  const vectorString = `CVSS:3.1/AV:${metrics.av}/AC:${metrics.ac}/PR:${metrics.pr}/UI:${metrics.ui}/S:${metrics.s}/C:${metrics.c}/I:${metrics.i}/A:${metrics.a}`;

  // Metric numerical values
  const avWeights: Record<AttackVector, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
  const acWeights: Record<AttackComplexity, number> = { L: 0.77, H: 0.44 };
  const uiWeights: Record<UserInteraction, number> = { N: 0.85, R: 0.62 };
  const ciaWeights: Record<CiaImpact, number> = { N: 0, L: 0.22, H: 0.56 };

  // PR depends on Scope
  let prWeight = 0.85;
  if (metrics.pr === 'L') {
    prWeight = metrics.s === 'U' ? 0.62 : 0.68;
  } else if (metrics.pr === 'H') {
    prWeight = metrics.s === 'U' ? 0.27 : 0.5;
  }

  const impactConf = ciaWeights[metrics.c];
  const impactInteg = ciaWeights[metrics.i];
  const impactAvail = ciaWeights[metrics.a];

  // Impact Sub-Score (ISS)
  const iss = 1 - (1 - impactConf) * (1 - impactInteg) * (1 - impactAvail);

  if (iss <= 0) {
    return { baseScore: 0.0, severity: Severity.INFORMATIONAL, vectorString };
  }

  let impact: number;
  if (metrics.s === 'U') {
    impact = 6.42 * iss;
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  }

  const exploitability =
    8.22 * avWeights[metrics.av] * acWeights[metrics.ac] * prWeight * uiWeights[metrics.ui];

  let rawScore: number;
  if (metrics.s === 'U') {
    rawScore = Math.min(impact + exploitability, 10);
  } else {
    rawScore = Math.min(1.08 * (impact + exploitability), 10);
  }

  // FIRST CVSS 3.1 official RoundUp function
  const intInput = Math.round(rawScore * 100000);
  let baseScore: number;
  if (intInput % 10000 === 0) {
    baseScore = intInput / 100000;
  } else {
    baseScore = (Math.floor(intInput / 10000) + 1) / 10;
  }
  const clampedScore = Math.min(Math.max(baseScore, 0), 10);

  let severity: Severity = Severity.INFORMATIONAL;
  if (clampedScore === 0) {
    severity = Severity.INFORMATIONAL;
  } else if (clampedScore < 4.0) {
    severity = Severity.LOW;
  } else if (clampedScore < 7.0) {
    severity = Severity.MEDIUM;
  } else if (clampedScore < 9.0) {
    severity = Severity.HIGH;
  } else {
    severity = Severity.CRITICAL;
  }

  return {
    baseScore: clampedScore,
    severity,
    vectorString,
  };
}

/**
 * Parses a standard CVSS 3.1 vector string into metrics.
 */
export function parseCvss31Vector(vector: string): Cvss31Metrics | null {
  const clean = vector.replace(/^CVSS:3\.[01]\//, '');
  const parts = clean.split('/');
  const map: Record<string, string> = {};

  for (const part of parts) {
    const [key, val] = part.split(':');
    if (key && val) map[key.toUpperCase()] = val.toUpperCase();
  }

  if (
    !map['AV'] ||
    !map['AC'] ||
    !map['PR'] ||
    !map['UI'] ||
    !map['S'] ||
    !map['C'] ||
    !map['I'] ||
    !map['A']
  ) {
    return null;
  }

  return {
    av: map['AV'] as AttackVector,
    ac: map['AC'] as AttackComplexity,
    pr: map['PR'] as PrivilegesRequired,
    ui: map['UI'] as UserInteraction,
    s: map['S'] as ScopeMetric,
    c: map['C'] as CiaImpact,
    i: map['I'] as CiaImpact,
    a: map['A'] as CiaImpact,
  };
}

// ─── PII & Secret Redaction (Zero-Retention Guardrail) ─────────

/**
 * Redacts secrets, tokens, sensitive credentials, and private IPs from report text
 * before passing into any external LLM prompt.
 */
export function redactSensitiveData(text: string): { redactedText: string; detectedSecretsCount: number } {
  let count = 0;
  let result = text;

  // Patterns for credentials
  const patterns: Array<{ regex: RegExp; replacement: string }> = [
    // Bearer tokens
    { regex: /Bearer\s+[A-Za-z0-9_\-\.]{16,}/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
    // Generic API keys (sk-, ghp_, xoxb-, eyJ...)
    { regex: /(?:sk|ghp|gho|glpat|xoxb|xoxp)-[A-Za-z0-9_\-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
    // JWT tokens
    { regex: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, replacement: '[REDACTED_JWT]' },
    // AWS Secret Key
    { regex: /(?:aws_secret_access_key|aws_key_id)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{20,}['"]?/gi, replacement: '$1: [REDACTED_AWS_CREDENTIAL]' },
    // Password / Secret in json or query
    { regex: /(["']?(?:password|passwd|secret|api_key|access_token)["']?\s*[:=]\s*["'])([^"'\s]{4,})(["'])/gi, replacement: '$1[REDACTED_PASSWORD]$3' },
    // Private IPv4 addresses (10.x.x.x, 192.168.x.x, 172.16.x.x-172.31.x.x)
    { regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g, replacement: '[REDACTED_INTERNAL_IP]' },
  ];

  for (const { regex, replacement } of patterns) {
    const matches = result.match(regex);
    if (matches) {
      count += matches.length;
      result = result.replace(regex, replacement);
    }
  }

  return { redactedText: result, detectedSecretsCount: count };
}

// ─── Mathematical Vector Utilities ────────────────────────────

/**
 * Calculates Cosine Similarity between two numerical vectors.
 * Returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i]!;
    const valB = b[i]!;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Submission Copilot Types & Schemas ────────────────────────

export const submissionCopilotInputSchema = z.object({
  title: z.string().default(''),
  vulnCategory: z.nativeEnum(VulnCategory).optional(),
  targetAsset: z.string().default(''),
  reproSteps: z.string().default(''),
  impactExplanation: z.string().default(''),
});
export type SubmissionCopilotInput = z.infer<typeof submissionCopilotInputSchema>;

export interface CopilotFeedbackItem {
  id: string;
  type: 'WARNING' | 'TIP' | 'SECURITY_ALERT' | 'QUALITY';
  title: string;
  message: string;
}

export interface SubmissionCopilotOutput {
  completenessScore: number; // 0 to 100
  readinessStatus: 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT';
  feedback: CopilotFeedbackItem[];
  detectedSecretsCount: number;
  estimatedCategory?: VulnCategory;
  suggestedMissingHeaders: string[];
}
