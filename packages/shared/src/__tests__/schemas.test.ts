import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  slugSchema,
  paginationSchema,
  registerSchema,
  loginSchema,
} from '../schemas.js';

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts strong passwords', () => {
    expect(passwordSchema.safeParse('MyP@ssw0rd!').success).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('alllowercase1!').success).toBe(false);
    expect(passwordSchema.safeParse('ALLUPPERCASE1!').success).toBe(false);
    expect(passwordSchema.safeParse('NoDigits!!').success).toBe(false);
    expect(passwordSchema.safeParse('NoSpecial1a').success).toBe(false);
  });
});

describe('usernameSchema', () => {
  it('accepts valid usernames', () => {
    expect(usernameSchema.safeParse('john-doe').success).toBe(true);
    expect(usernameSchema.safeParse('user123').success).toBe(true);
    expect(usernameSchema.safeParse('a.b').success).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false); // too short
    expect(usernameSchema.safeParse('-starts-dash').success).toBe(false);
    expect(usernameSchema.safeParse('ends-dash-').success).toBe(false);
  });
});

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    expect(slugSchema.safeParse('my-program').success).toBe(true);
    expect(slugSchema.safeParse('abc123').success).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(slugSchema.safeParse('ab').success).toBe(false); // too short
    expect(slugSchema.safeParse('UPPERCASE').success).toBe(false);
    expect(slugSchema.safeParse('-leading').success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('uses defaults when no input', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.parse({ page: '2', limit: '50' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('clamps limit to max 100', () => {
    expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('validates correct registration input', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      username: 'testuser',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates correct login input', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional totp code', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'anything',
      totpCode: '123456',
    });
    expect(result.success).toBe(true);
  });
});
