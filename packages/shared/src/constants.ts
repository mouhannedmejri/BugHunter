/** JWT token lifetimes */
export const JWT_ACCESS_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN_DAYS = 30;

/** SLA default deadlines in hours */
export const SLA_FIRST_RESPONSE_HOURS = 24;
export const SLA_TRIAGE_DECISION_DAYS = 5;
export const SLA_FIX_DAYS_BY_SEVERITY = {
  CRITICAL: 30,
  HIGH: 60,
  MEDIUM: 90,
  LOW: 90,
  INFORMATIONAL: 90,
} as const;

/** Pagination */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** File upload */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'video/mp4',
  'video/webm',
  'application/zip',
] as const;

/** Rate limiting */
export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/** Duplicate detection timeout (ms) */
export const DUPLICATE_DETECTION_TIMEOUT_MS = 60_000;

/** API version */
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
