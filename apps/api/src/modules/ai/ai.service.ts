import crypto from 'crypto';
import { prisma } from '@bughuntr/db';
import {
  calculateCvss31BaseScore,
  cosineSimilarity,
  redactSensitiveData,
  Severity,
  VulnCategory,
  NotFoundError,
} from '@bughuntr/shared';
import type {
  SubmissionCopilotInput,
  SubmissionCopilotOutput,
  CopilotFeedbackItem,
  Cvss31Metrics,
} from '@bughuntr/shared';

// Standard CWE Security Taxonomies with vetted remediation templates
const STANDARD_CWE_TAXONOMY: Array<{
  cweId: string;
  title: string;
  category: VulnCategory;
  typicalSeverity: Severity;
  metrics: Cvss31Metrics;
  remediationTemplate: string;
  keywords: string[];
}> = [
  {
    cweId: 'CWE-89',
    title: 'Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)',
    category: VulnCategory.SQLI,
    typicalSeverity: Severity.CRITICAL,
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' },
    keywords: ['sql', 'query', 'select', 'union', 'sleep', 'database', 'injection', 'sqli'],
    remediationTemplate: `### SQL Injection Remediation Guide
1. **Parameterized Queries / Prepared Statements**: Never concatenate untrusted user input directly into SQL strings.
\`\`\`typescript
// Secure Example using Prisma or parameterized SQL:
const user = await prisma.user.findFirst({
  where: { email: userInput } // Parameterized by ORM
});
\`\`\`
2. **Input Validation**: Use strict type-safe schemas (e.g., Zod) to validate inputs before query execution.
3. **Least Privilege**: Ensure the database user account only has privileges strictly necessary for its tasks.`,
  },
  {
    cweId: 'CWE-79',
    title: "Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')",
    category: VulnCategory.XSS,
    typicalSeverity: Severity.MEDIUM,
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'C', c: 'L', i: 'L', a: 'N' },
    keywords: ['xss', 'script', 'alert', 'dom', 'innerHTML', 'payload', 'cross-site scripting', 'cookie'],
    remediationTemplate: `### Cross-Site Scripting (XSS) Remediation Guide
1. **Context-Aware Output Encoding**: Ensure all dynamic data is HTML/URL/attribute-encoded before being rendered in the DOM.
2. **Use Safe Rendering Frameworks**: React and modern SPA frameworks automatically escape variables embedded in JSX:
\`\`\`tsx
// Safe: automatically escaped
<div>{userInput}</div>

// Avoid dangerous bypasses:
// <div dangerouslySetInnerHTML={{ __html: userInput }} /> // DO NOT USE
\`\`\`
3. **Content Security Policy (CSP)**: Configure strict CSP HTTP headers restricting inline script execution.`,
  },
  {
    cweId: 'CWE-918',
    title: 'Server-Side Request Forgery (SSRF)',
    category: VulnCategory.SSRF,
    typicalSeverity: Severity.HIGH,
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'C', c: 'H', i: 'L', a: 'N' },
    keywords: ['ssrf', 'metadata', '169.254', 'internal', 'webhook', 'fetch', 'request forgery'],
    remediationTemplate: `### SSRF Remediation Guide
1. **Strict URL Whitelisting**: Only permit requests to known, approved domain names and protocols (HTTPS only).
2. **Deny Private IP Ranges**: Validate DNS resolution and reject loopback (\`127.0.0.1\`), cloud metadata (\`169.254.169.254\`), and RFC 1918 private subnets.
3. **Isolate Outbound Traffic**: Use a dedicated forward proxy with egress filtering rules.`,
  },
  {
    cweId: 'CWE-639',
    title: 'Authorization Bypass Through User-Controlled Key (IDOR)',
    category: VulnCategory.IDOR,
    typicalSeverity: Severity.HIGH,
    metrics: { av: 'N', ac: 'L', pr: 'L', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'N' },
    keywords: ['idor', 'direct object reference', 'access control', 'horizontal', 'privilege', 'user id'],
    remediationTemplate: `### IDOR Remediation Guide
1. **Ownership Verification**: Always verify that the authenticated session owns or has permission to access the requested resource ID:
\`\`\`typescript
const record = await prisma.document.findFirst({
  where: {
    id: documentId,
    orgId: user.activeOrgId // Explicit ownership check
  }
});
if (!record) throw new ForbiddenError('Access Denied');
\`\`\`
2. **Use Indirect Reference Maps / UUIDs**: Avoid predictable sequential auto-incrementing integer IDs.`,
  },
  {
    cweId: 'CWE-352',
    title: 'Cross-Site Request Forgery (CSRF)',
    category: VulnCategory.CSRF,
    typicalSeverity: Severity.MEDIUM,
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'R', s: 'U', c: 'N', i: 'H', a: 'N' },
    keywords: ['csrf', 'samesite', 'cross-site request forgery', 'cookie', 'state changing'],
    remediationTemplate: `### CSRF Remediation Guide
1. **SameSite Cookies**: Ensure authentication session cookies are marked with \`SameSite=Lax\` or \`SameSite=Strict\`.
2. **Anti-CSRF Tokens**: Require cryptographic synchronizer tokens on all state-altering mutation endpoints (POST/PUT/PATCH/DELETE).`,
  },
  {
    cweId: 'CWE-78',
    title: 'Improper Neutralization of Special Elements used in an OS Command (Command Injection)',
    category: VulnCategory.RCE,
    typicalSeverity: Severity.CRITICAL,
    metrics: { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'C', c: 'H', i: 'H', a: 'H' },
    keywords: ['rce', 'command injection', 'exec', 'system', 'shell', 'bash', 'spawn'],
    remediationTemplate: `### OS Command Injection Remediation Guide
1. **Avoid Spawning Shells**: Use language APIs directly rather than invoking system commands through a shell.
2. **Safe Argument Arrays**: If external binary execution is strictly required, pass arguments as discrete array items without shell evaluation:
\`\`\`typescript
import { execFile } from 'child_process';
execFile('/usr/bin/tool', ['--arg', safeArgument], (err, stdout) => { ... });
\`\`\``,
  },
];

export class AiService {
  /**
   * Generates a 1536-dimensional vector embedding for text.
   * If OPENAI_API_KEY is configured, queries OpenAI embeddings endpoint.
   * Otherwise, utilizes a deterministic semantic projection fallback (offline/testing ready).
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env['OPENAI_API_KEY'];

    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: text.slice(0, 8000),
            model: 'text-embedding-3-small',
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json?.data?.[0]?.embedding) {
            return json.data[0].embedding as number[];
          }
        }
      } catch (err) {
        // Fall through to deterministic embedding on network error
      }
    }

    // Deterministic semantic projection fallback:
    // Produces a consistent, unit-normalized 1536-dimensional vector based on term frequencies and character n-grams.
    return AiService.createDeterministicEmbedding(text, 1536);
  }

  /**
   * Deterministic semantic embedding generation for local dev & testing.
   */
  static createDeterministicEmbedding(text: string, dimensions = 1536): number[] {
    const normalized = text.toLowerCase().trim();
    const vector = new Array<number>(dimensions).fill(0);
    const tokens = normalized.split(/[\s,.;:!?()_/\-"'<>]+/);

    for (const token of tokens) {
      if (!token) continue;
      const hash = crypto.createHash('sha256').update(token).digest();
      const index = hash.readUInt16BE(0) % dimensions;
      const weight = Math.min(token.length / 5, 2.0);
      vector[index] = (vector[index] ?? 0) + weight;
    }

    // Character 3-grams for substring/lexical capture
    for (let i = 0; i < normalized.length - 2; i++) {
      const trigram = normalized.slice(i, i + 3);
      const hash = crypto.createHash('md5').update(trigram).digest();
      const index = hash.readUInt16BE(0) % dimensions;
      vector[index] = (vector[index] ?? 0) + 0.5;
    }

    // L2 Normalize to unit vector
    let norm = 0;
    for (const val of vector) {
      norm += val * val;
    }
    const magnitude = Math.sqrt(norm);
    if (magnitude === 0) return vector;

    return vector.map((v) => v / magnitude);
  }

  /**
   * Upserts the vector embedding for a report into ReportEmbedding.
   */
  static async saveReportEmbedding(reportId: string): Promise<void> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { program: true },
    });
    if (!report) return;

    const combinedText = `${report.title}\n\nCategory: ${report.vulnCategory}\n\nReproduction Steps:\n${report.reproSteps}\n\nImpact:\n${report.impactExplanation}`;
    const textHash = crypto.createHash('sha256').update(combinedText).digest('hex');
    const embedding = await AiService.generateEmbedding(combinedText);

    // Save record to DB
    const existing = await prisma.reportEmbedding.findUnique({ where: { reportId } });
    if (existing) {
      await prisma.reportEmbedding.update({
        where: { reportId },
        data: {
          textHash,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.reportEmbedding.create({
        data: {
          reportId,
          programId: report.programId,
          orgId: report.program.orgId,
          model: 'text-embedding-3-small',
          dimensions: 1536,
          textHash,
        },
      });
    }

    // If pgvector is enabled in PostgreSQL, store vector binary data via raw query
    try {
      const vectorLiteral = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "ReportEmbedding" SET embedding = $1::vector WHERE "reportId" = $2`,
        vectorLiteral,
        reportId
      );
    } catch (err) {
      // If native pgvector extension is not yet loaded in Postgres, keep record for in-memory similarity
    }
  }

  /**
   * Search for duplicate candidates in the same program using hybrid similarity.
   */
  static async findDuplicateCandidates(
    reportId: string,
    limit = 5
  ): Promise<
    Array<{
      id: string;
      title: string;
      similarity: number;
      rationale: string;
    }>
  > {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) return [];

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const candidates = await prisma.report.findMany({
      where: {
        programId: report.programId,
        id: { not: reportId },
        createdAt: { gte: ninetyDaysAgo },
        status: { in: ['SUBMITTED', 'TRIAGING', 'ACCEPTED'] },
      },
      select: {
        id: true,
        title: true,
        reproSteps: true,
        impactExplanation: true,
        vulnCategory: true,
      },
      take: 20,
    });

    if (candidates.length === 0) return [];

    const targetText = `${report.title} ${report.reproSteps} ${report.impactExplanation}`;
    const targetVector = await AiService.generateEmbedding(targetText);

    const scored: Array<{
      id: string;
      title: string;
      similarity: number;
      rationale: string;
    }> = [];

    for (const candidate of candidates) {
      const candidateText = `${candidate.title} ${candidate.reproSteps} ${candidate.impactExplanation}`;
      const candidateVector = await AiService.generateEmbedding(candidateText);

      const semanticSim = Math.max(0, cosineSimilarity(targetVector, candidateVector));

      // Category matching bonus
      const categoryMatch = candidate.vulnCategory === report.vulnCategory ? 0.05 : 0;
      const combinedScore = Math.min(1.0, Math.round((semanticSim + categoryMatch) * 100) / 100);

      if (combinedScore > 0.6) {
        let rationale = `Moderate semantic overlap (${Math.round(combinedScore * 100)}%) detected across reproduction steps and vulnerability category.`;
        if (combinedScore >= 0.82) {
          rationale = `High probability duplicate (${Math.round(combinedScore * 100)}%): Identical root flaw and attack pattern discovered in recent submission #${candidate.id}.`;
        }

        scored.push({
          id: candidate.id,
          title: candidate.title,
          similarity: combinedScore,
          rationale,
        });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  /**
   * Evaluates program scope compliance for a submitted target asset.
   */
  static async evaluateScope(
    programId: string,
    assetId: string | null,
    targetIdentifier?: string
  ): Promise<{ status: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'UNCERTAIN'; rationale: string }> {
    const assets = await prisma.asset.findMany({
      where: { programId, deletedAt: null },
    });

    if (assets.length === 0) {
      return {
        status: 'IN_SCOPE',
        rationale: 'Program does not have restricted assets defined; open scope policy applies.',
      };
    }

    if (assetId) {
      const matchingAsset = assets.find((a) => a.id === assetId);
      if (matchingAsset) {
        if (matchingAsset.inScope) {
          return {
            status: 'IN_SCOPE',
            rationale: `Target is linked to verified in-scope asset: ${matchingAsset.identifier} (${matchingAsset.type}).`,
          };
        } else {
          return {
            status: 'OUT_OF_SCOPE',
            rationale: `Target is explicitly marked OUT OF SCOPE in program policies: ${matchingAsset.identifier}.`,
          };
        }
      }
    }

    if (targetIdentifier) {
      const normalizedTarget = targetIdentifier.toLowerCase().trim();
      const inScopeAssets = assets.filter((a) => a.inScope);
      const outScopeAssets = assets.filter((a) => !a.inScope);

      // Check explicit out-of-scope matches first
      for (const asset of outScopeAssets) {
        if (normalizedTarget.includes(asset.identifier.toLowerCase())) {
          return {
            status: 'OUT_OF_SCOPE',
            rationale: `Target matches out-of-scope asset pattern: ${asset.identifier}.`,
          };
        }
      }

      // Check in-scope matches
      for (const asset of inScopeAssets) {
        const id = asset.identifier.toLowerCase();
        if (id.startsWith('*.')) {
          const rootDomain = id.slice(2);
          if (normalizedTarget.endsWith(rootDomain) || normalizedTarget === rootDomain) {
            return {
              status: 'IN_SCOPE',
              rationale: `Target matches wildcard in-scope asset definition: ${asset.identifier}.`,
            };
          }
        } else if (normalizedTarget.includes(id)) {
          return {
            status: 'IN_SCOPE',
            rationale: `Target matches in-scope asset: ${asset.identifier}.`,
          };
        }
      }
    }

    return {
      status: 'UNCERTAIN',
      rationale: 'Target asset was not automatically resolved against defined in-scope assets. Manual triager confirmation recommended.',
    };
  }

  /**
   * Executes AI-assisted automated triage for a report:
   * 1. Redacts sensitive secrets for privacy/guardrails.
   * 2. Evaluates scope compliance.
   * 3. Matches security standard (CWE) and generates CVSS 3.1 score with rationale.
   * 4. Generates contextual code-level remediation.
   * 5. Checks for duplicates.
   * 6. Persists into AiTriageAssessment.
   */
  static async performAiTriage(reportId: string): Promise<any> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        asset: true,
        program: {
          include: {
            assets: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundError(`Report with ID ${reportId} not found`);
    }

    // 1. Guardrail: Redact secrets before processing
    const combinedContent = `${report.title} ${report.reproSteps} ${report.impactExplanation}`;
    const { redactedText } = redactSensitiveData(combinedContent);

    // 2. Scope Verification
    const scopeResult = await AiService.evaluateScope(
      report.programId,
      report.assetId,
      report.asset?.identifier
    );

    // 3. Match CWE Taxonomy & Calculate CVSS 3.1
    const lowerContent = redactedText.toLowerCase();
    let bestCwe = STANDARD_CWE_TAXONOMY[0]!;
    let highestScore = -1;

    for (const cwe of STANDARD_CWE_TAXONOMY) {
      let score = 0;
      if (cwe.category === report.vulnCategory) score += 5;
      for (const kw of cwe.keywords) {
        if (lowerContent.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestCwe = cwe;
      }
    }

    // Calculate CVSS 3.1 score
    const cvss = calculateCvss31BaseScore(bestCwe.metrics);

    // 4. Duplicate Check
    const duplicates = await AiService.findDuplicateCandidates(reportId, 1);
    const topDuplicate = duplicates[0] || null;

    const reasoning = `Classified as ${bestCwe.title} (${bestCwe.cweId}) based on reproduction methodology and impact indicators. Evaluated CVSS 3.1 attack vector as ${bestCwe.metrics.av === 'N' ? 'Network' : 'Local'}, complexity as ${bestCwe.metrics.ac === 'L' ? 'Low' : 'High'}, and privileges as ${bestCwe.metrics.pr}.`;

    // 5. Upsert AiTriageAssessment
    const assessment = await prisma.aiTriageAssessment.upsert({
      where: { reportId },
      create: {
        reportId,
        predictedSeverity: cvss.severity,
        cvssVector: cvss.vectorString,
        cvssScore: cvss.baseScore,
        cweId: bestCwe.cweId,
        cweName: bestCwe.title,
        reasoning,
        scopeStatus: scopeResult.status,
        scopeRationale: scopeResult.rationale,
        remediationNotes: bestCwe.remediationTemplate,
        duplicateCandidateId: topDuplicate?.id || null,
        duplicateSimilarity: topDuplicate?.similarity || null,
        duplicateRationale: topDuplicate?.rationale || null,
        status: 'COMPLETED',
      },
      update: {
        predictedSeverity: cvss.severity,
        cvssVector: cvss.vectorString,
        cvssScore: cvss.baseScore,
        cweId: bestCwe.cweId,
        cweName: bestCwe.title,
        reasoning,
        scopeStatus: scopeResult.status,
        scopeRationale: scopeResult.rationale,
        remediationNotes: bestCwe.remediationTemplate,
        duplicateCandidateId: topDuplicate?.id || null,
        duplicateSimilarity: topDuplicate?.similarity || null,
        duplicateRationale: topDuplicate?.rationale || null,
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    // Also update report cvssScore if empty
    if (!report.cvssScore) {
      await prisma.report.update({
        where: { id: reportId },
        data: { cvssScore: cvss.baseScore },
      });
    }

    return assessment;
  }

  /**
   * Researcher Submission Copilot: Real-time feedback in the frontend report editor.
   */
  static async submissionCopilot(input: SubmissionCopilotInput): Promise<SubmissionCopilotOutput> {
    const feedback: CopilotFeedbackItem[] = [];
    let score = 30; // base score

    const { detectedSecretsCount } = redactSensitiveData(
      `${input.title} ${input.reproSteps} ${input.impactExplanation}`
    );

    if (detectedSecretsCount > 0) {
      feedback.push({
        id: 'secrets-detected',
        type: 'SECURITY_ALERT',
        title: 'Sensitive Credentials Detected',
        message: `Found ${detectedSecretsCount} potential API key(s), session tokens, or passwords in your draft. Please remove live credentials and replace them with placeholders (e.g. \`[TOKEN]\`).`,
      });
    }

    // Title validation
    if (input.title.trim().length >= 10) {
      score += 15;
    } else {
      feedback.push({
        id: 'title-short',
        type: 'TIP',
        title: 'Vague Report Title',
        message: 'A concise, specific title helps triage (e.g., "Reflected XSS on /search via \'q\' parameter").',
      });
    }

    // Reproduction steps validation
    const repro = input.reproSteps.trim();
    const missingHeaders: string[] = [];

    if (repro.length < 50) {
      feedback.push({
        id: 'repro-short',
        type: 'WARNING',
        title: 'Reproduction Steps Incomplete',
        message: 'Provide step-by-step reproduction instructions starting from an unauthenticated or initial state.',
      });
    } else {
      score += 25;

      // Check for HTTP methods or curl commands
      const hasHttp = /\b(GET|POST|PUT|DELETE|PATCH|curl|http[s]?:\/\/)\b/i.test(repro);
      if (hasHttp) {
        score += 10;
      } else {
        feedback.push({
          id: 'missing-poc-request',
          type: 'TIP',
          title: 'Include HTTP Request or cURL Command',
          message: 'Adding a raw HTTP request, cURL command, or request body accelerates verification.',
        });
      }

      // Check for numbered steps
      const hasSteps = /(?:^|\n)\s*(?:1[.)]|step\s*1)/i.test(repro);
      if (hasSteps) {
        score += 10;
      } else {
        feedback.push({
          id: 'step-structure',
          type: 'QUALITY',
          title: 'Structured Step Format',
          message: 'Use numbered steps (1., 2., 3.) so reviewers can easily replicate the behavior.',
        });
      }
    }

    // Impact validation
    if (input.impactExplanation.trim().length >= 30) {
      score += 10;
    } else {
      feedback.push({
        id: 'impact-missing',
        type: 'WARNING',
        title: 'Explain Business & Security Impact',
        message: 'Detail what an attacker could achieve (e.g., data exfiltration, account takeover, denial of service).',
      });
    }

    const completenessScore = Math.min(100, Math.max(0, score));
    let readinessStatus: 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT' = 'NEEDS_WORK';

    if (completenessScore >= 80 && detectedSecretsCount === 0) {
      readinessStatus = 'EXCELLENT';
    } else if (completenessScore >= 60) {
      readinessStatus = 'GOOD';
    }

    return {
      completenessScore,
      readinessStatus,
      feedback,
      detectedSecretsCount,
      suggestedMissingHeaders: missingHeaders,
    };
  }

  /**
   * Seeds default CWE Security Knowledge into the database.
   */
  static async seedKnowledgeBase(): Promise<void> {
    for (const item of STANDARD_CWE_TAXONOMY) {
      const cvss = calculateCvss31BaseScore(item.metrics);
      await prisma.securityKnowledge.upsert({
        where: { cweId: item.cweId },
        create: {
          cweId: item.cweId,
          title: item.title,
          category: item.category,
          description: `Vulnerability pattern for ${item.title}`,
          typicalSeverity: item.typicalSeverity,
          cvssBaseVector: cvss.vectorString,
          remediationTemplate: item.remediationTemplate,
        },
        update: {
          title: item.title,
          category: item.category,
          typicalSeverity: item.typicalSeverity,
          cvssBaseVector: cvss.vectorString,
          remediationTemplate: item.remediationTemplate,
          updatedAt: new Date(),
        },
      });
    }
  }
}
