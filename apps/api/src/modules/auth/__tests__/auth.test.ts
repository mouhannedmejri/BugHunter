import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerBodySchema,
  loginBodySchema,
  verifyEmailBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  totpVerifyBodySchema,
  revokeSessionParamsSchema,
  loginHistoryQuerySchema,
} from '../auth.schemas.js';

// ─── Schema Validation Tests ─────────────────────────────

describe('registerBodySchema', () => {
  it('accepts valid registration', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      username: 'testuser',
    });
    expect(result.success).toBe(true);
  });

  it('accepts registration with displayName', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      username: 'testuser',
      displayName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerBodySchema.safeParse({
      email: 'not-email',
      password: 'Str0ng!Pass',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password - no uppercase', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'weak1pass!',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password - no digit', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'WeakPass!!',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password - no special char', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'WeakPass11',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password - too short', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Ab1!',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid username - too short', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      username: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid username - starts with dash', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      username: '-invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = registerBodySchema.safeParse({
      password: 'Str0ng!Pass',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing username', () => {
    const result = registerBodySchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginBodySchema', () => {
  it('accepts valid login', () => {
    const result = loginBodySchema.safeParse({
      email: 'test@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('accepts login with TOTP code', () => {
    const result = loginBodySchema.safeParse({
      email: 'test@example.com',
      password: 'mypassword',
      totpCode: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid TOTP code length', () => {
    const result = loginBodySchema.safeParse({
      email: 'test@example.com',
      password: 'mypassword',
      totpCode: '12345', // needs exactly 6
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginBodySchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginBodySchema.safeParse({
      email: 'not-valid',
      password: 'mypassword',
    });
    expect(result.success).toBe(false);
  });
});

describe('verifyEmailBodySchema', () => {
  it('accepts valid token', () => {
    const result = verifyEmailBodySchema.safeParse({ token: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = verifyEmailBodySchema.safeParse({ token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing token', () => {
    const result = verifyEmailBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordBodySchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordBodySchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordBodySchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordBodySchema', () => {
  it('accepts valid reset', () => {
    const result = resetPasswordBodySchema.safeParse({
      token: 'some-reset-token',
      newPassword: 'NewStr0ng!Pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak new password', () => {
    const result = resetPasswordBodySchema.safeParse({
      token: 'some-reset-token',
      newPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing token', () => {
    const result = resetPasswordBodySchema.safeParse({
      newPassword: 'NewStr0ng!Pass',
    });
    expect(result.success).toBe(false);
  });
});

describe('totpVerifyBodySchema', () => {
  it('accepts valid 6-digit code', () => {
    const result = totpVerifyBodySchema.safeParse({ code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects code != 6 chars', () => {
    expect(totpVerifyBodySchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(totpVerifyBodySchema.safeParse({ code: '1234567' }).success).toBe(false);
  });

  it('rejects missing code', () => {
    const result = totpVerifyBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('revokeSessionParamsSchema', () => {
  it('accepts valid id', () => {
    const result = revokeSessionParamsSchema.safeParse({ id: 'session123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty id', () => {
    const result = revokeSessionParamsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('loginHistoryQuerySchema', () => {
  it('uses default limit of 20', () => {
    const result = loginHistoryQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('coerces string to number', () => {
    const result = loginHistoryQuerySchema.parse({ limit: '10' });
    expect(result.limit).toBe(10);
  });

  it('rejects limit > 50', () => {
    const result = loginHistoryQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects limit < 1', () => {
    const result = loginHistoryQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });
});

// ─── Crypto Utils Tests ──────────────────────────────────

describe('crypto utils', () => {
  // Mock env before importing
  vi.stubEnv('TOTP_ENCRYPTION_KEY', 'test-encryption-key-that-is-long-enough');

  it('encrypt and decrypt round-trip', async () => {
    const { encrypt, decrypt } = await import('../../../lib/crypto.js');
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('generates different ciphertexts for same input (random IV)', async () => {
    const { encrypt } = await import('../../../lib/crypto.js');
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('generateSecureToken creates URL-safe tokens', async () => {
    const { generateSecureToken } = await import('../../../lib/crypto.js');
    const token = generateSecureToken();
    expect(token.length).toBeGreaterThan(0);
    // base64url chars only
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });

  it('hashToken produces consistent SHA-256 hex', async () => {
    const { hashToken } = await import('../../../lib/crypto.js');
    const token = 'test-token';
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 = 64 hex chars
  });
});

// ─── Password Utils Tests ────────────────────────────────

describe('password utils', () => {
  it('hashPassword returns argon2id hash', async () => {
    const { hashPassword } = await import('../../../lib/password.js');
    const hash = await hashPassword('TestPassword1!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifyPassword succeeds for correct password', async () => {
    const { hashPassword, verifyPassword } = await import('../../../lib/password.js');
    const hash = await hashPassword('TestPassword1!');
    const valid = await verifyPassword(hash, 'TestPassword1!');
    expect(valid).toBe(true);
  });

  it('verifyPassword fails for wrong password', async () => {
    const { hashPassword, verifyPassword } = await import('../../../lib/password.js');
    const hash = await hashPassword('TestPassword1!');
    const valid = await verifyPassword(hash, 'WrongPassword1!');
    expect(valid).toBe(false);
  });

  it('verifyPassword returns false for invalid hash', async () => {
    const { verifyPassword } = await import('../../../lib/password.js');
    const valid = await verifyPassword('not-a-hash', 'TestPassword1!');
    expect(valid).toBe(false);
  });
});
