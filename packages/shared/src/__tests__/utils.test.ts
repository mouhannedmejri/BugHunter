import { describe, it, expect } from 'vitest';
import {
  slugify,
  formatCentsToUsd,
  clamp,
  omit,
  pick,
  isDefined,
  createPaginationMeta,
  maskString,
} from '../utils.js';

describe('slugify', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(slugify('My Program! (v2)')).toBe('my-program-v2');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  test  ')).toBe('test');
  });
});

describe('formatCentsToUsd', () => {
  it('formats cents to dollar string', () => {
    expect(formatCentsToUsd(10050)).toBe('$100.50');
    expect(formatCentsToUsd(0)).toBe('$0.00');
    expect(formatCentsToUsd(99)).toBe('$0.99');
  });
});

describe('clamp', () => {
  it('clamps values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('omit', () => {
  it('omits specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});

describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});

describe('isDefined', () => {
  it('returns true for defined values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('createPaginationMeta', () => {
  it('calculates pagination meta correctly', () => {
    const meta = createPaginationMeta(100, 1, 20);
    expect(meta).toEqual({ page: 1, limit: 20, total: 100, totalPages: 5 });
  });

  it('handles partial last page', () => {
    const meta = createPaginationMeta(21, 1, 20);
    expect(meta.totalPages).toBe(2);
  });
});

describe('maskString', () => {
  it('masks middle characters', () => {
    expect(maskString('1234567890')).toBe('1234**7890');
  });

  it('fully masks short strings', () => {
    expect(maskString('abc', 4)).toBe('***');
  });
});
