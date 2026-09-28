import { describe, it, expect } from 'vitest';
import {
  calculateCvss31BaseScore,
  parseCvss31Vector,
  redactSensitiveData,
  cosineSimilarity,
} from '../ai.js';
import { Severity } from '../enums.js';

describe('CVSS 3.1 Base Score Calculator', () => {
  it('calculates Critical 9.8 for unauthenticated remote code execution', () => {
    // Standard CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
    const result = calculateCvss31BaseScore({
      av: 'N',
      ac: 'L',
      pr: 'N',
      ui: 'N',
      s: 'U',
      c: 'H',
      i: 'H',
      a: 'H',
    });

    expect(result.baseScore).toBe(9.8);
    expect(result.severity).toBe(Severity.CRITICAL);
    expect(result.vectorString).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
  });

  it('calculates Medium 6.1 for Reflected/Stored XSS with Scope Changed', () => {
    // Standard CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
    const result = calculateCvss31BaseScore({
      av: 'N',
      ac: 'L',
      pr: 'N',
      ui: 'R',
      s: 'C',
      c: 'L',
      i: 'L',
      a: 'N',
    });

    expect(result.baseScore).toBe(6.1);
    expect(result.severity).toBe(Severity.MEDIUM);
  });

  it('calculates 0.0 Informational when there is no CIA impact', () => {
    const result = calculateCvss31BaseScore({
      av: 'N',
      ac: 'L',
      pr: 'N',
      ui: 'N',
      s: 'U',
      c: 'N',
      i: 'N',
      a: 'N',
    });

    expect(result.baseScore).toBe(0.0);
    expect(result.severity).toBe(Severity.INFORMATIONAL);
  });

  it('parses valid CVSS 3.1 vector string correctly', () => {
    const parsed = parseCvss31Vector('CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N');
    expect(parsed).not.toBeNull();
    expect(parsed?.av).toBe('N');
    expect(parsed?.ac).toBe('L');
    expect(parsed?.pr).toBe('N');
    expect(parsed?.ui).toBe('R');
    expect(parsed?.s).toBe('C');
    expect(parsed?.c).toBe('L');
    expect(parsed?.i).toBe('L');
    expect(parsed?.a).toBe('N');
  });

  it('rejects malformed CVSS vector string', () => {
    const parsed = parseCvss31Vector('INVALID:VECTOR/FOO:BAR');
    expect(parsed).toBeNull();
  });
});

describe('PII & Secret Redaction Guardrail', () => {
  it('redacts Bearer tokens and API keys', () => {
    const raw = 'Sent request with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID and sk-1234567890abcdef1234567890abcdef';
    const { redactedText, detectedSecretsCount } = redactSensitiveData(raw);

    expect(detectedSecretsCount).toBeGreaterThanOrEqual(2);
    expect(redactedText).toContain('[REDACTED_TOKEN]');
    expect(redactedText).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(redactedText).not.toContain('sk-1234567890abcdef1234567890abcdef');
  });

  it('redacts private IPv4 addresses', () => {
    const raw = 'Internal database running on 192.168.1.55 and proxy on 10.0.4.12:8080';
    const { redactedText, detectedSecretsCount } = redactSensitiveData(raw);

    expect(detectedSecretsCount).toBe(2);
    expect(redactedText).not.toContain('192.168.1.55');
    expect(redactedText).not.toContain('10.0.4.12');
    expect(redactedText).toContain('[REDACTED_INTERNAL_IP]');
  });
});

describe('Cosine Similarity', () => {
  it('computes 1.0 for identical vectors', () => {
    const vecA = [0.2, 0.4, 0.8];
    const vecB = [0.2, 0.4, 0.8];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
  });

  it('computes 0.0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});
