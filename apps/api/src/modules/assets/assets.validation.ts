import * as dns from 'node:dns/promises';
import cidrRegex from 'cidr-regex';
import { AssetType } from '@bughuntr/db';
import {
  BadRequestError,
  normalizeWildcardIdentifier,
  validateAssetIdentifierFormat,
} from '@bughuntr/shared';
import { enqueueAssetVerification } from '../../lib/asset-verification-queue.js';

const cidrExact = cidrRegex({ exact: true });

export type ValidatedAssetIdentifier = ReturnType<
  typeof normalizeWildcardIdentifier
>;

/**
 * Format checks + optional `*.` → wildcardSupport. IP_RANGE uses cidr-regex.
 */
export function validateAssetIdentifierForApi(
  type: AssetType,
  raw: string,
):
  | { ok: true; normalized: ValidatedAssetIdentifier }
  | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (type === AssetType.IP_RANGE) {
    if (!cidrExact.test(trimmed)) {
      return { ok: false, message: 'Invalid CIDR notation' };
    }
    return {
      ok: true,
      normalized: {
        identifier: trimmed,
        wildcardSupport: false,
        dnsHost: null,
      },
    };
  }

  const fmt = validateAssetIdentifierFormat(type, raw);
  if (!fmt.ok) {
    return fmt;
  }

  let wildcardSupport = fmt.normalized.wildcardSupport;
  if (raw.trim().startsWith('*.')) {
    wildcardSupport = true;
  }

  return {
    ok: true,
    normalized: {
      ...fmt.normalized,
      wildcardSupport,
    },
  };
}

export async function verifyDomainExists(dnsHost: string | null): Promise<boolean> {
  if (!dnsHost) return false;
  try {
    await dns.lookup(dnsHost);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous-style checks used on create/update: format + DNS for DOMAIN/SUBDOMAIN.
 */
export async function validateAssetBeforePersist(
  type: AssetType,
  rawIdentifier: string,
): Promise<ValidatedAssetIdentifier> {
  const v = validateAssetIdentifierForApi(type, rawIdentifier);
  if (!v.ok) {
    throw new BadRequestError(v.message);
  }

  if (type === AssetType.DOMAIN || type === AssetType.SUBDOMAIN) {
    const host = v.normalized.dnsHost;
    if (!host || !(await verifyDomainExists(host))) {
      throw new BadRequestError('DNS lookup did not resolve this domain');
    }
  }

  return v.normalized;
}

export async function scheduleAssetVerification(assetId: string): Promise<void> {
  await enqueueAssetVerification(assetId);
}
