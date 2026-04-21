import { AssetType } from './enums.js';

/** Reverse-DNS bundle id: com.example.app */
const BUNDLE_ID_RE =
  /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/** Domain / subdomain: optional `*.` then hostname labels */
const DOMAIN_OR_SUBDOMAIN_RE =
  /^(?:\*\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/i;

export type NormalizedWildcard = {
  identifier: string;
  wildcardSupport: boolean;
  /** Apex host for DNS (strips `*.`) */
  dnsHost: string | null;
};

export function normalizeWildcardIdentifier(raw: string): NormalizedWildcard {
  const trimmed = raw.trim();
  if (trimmed.startsWith('*.')) {
    const apex = trimmed.slice(2).trim().toLowerCase();
    return {
      identifier: trimmed,
      wildcardSupport: true,
      dnsHost: apex || null,
    };
  }
  return {
    identifier: trimmed,
    wildcardSupport: false,
    dnsHost: trimmed.toLowerCase() || null,
  };
}

export function validateAssetIdentifierFormat(
  type: (typeof AssetType)[keyof typeof AssetType],
  rawIdentifier: string,
): { ok: true; normalized: NormalizedWildcard } | { ok: false; message: string } {
  const normalized = normalizeWildcardIdentifier(rawIdentifier);
  const id = normalized.identifier;
  if (!id) {
    return { ok: false, message: 'Identifier is required' };
  }
  if (id.length > 500) {
    return { ok: false, message: 'Identifier is too long' };
  }

  switch (type) {
    case AssetType.DOMAIN:
    case AssetType.SUBDOMAIN: {
      const display = id.toLowerCase();
      if (display.length > 253 || !DOMAIN_OR_SUBDOMAIN_RE.test(display)) {
        return { ok: false, message: 'Invalid domain or subdomain identifier' };
      }
      return { ok: true, normalized };
    }
    case AssetType.IP_RANGE:
      return {
        ok: false,
        message: 'IP_RANGE is validated with cidr-regex in the API/worker',
      };
    case AssetType.MOBILE_APP: {
      if (!BUNDLE_ID_RE.test(id)) {
        return { ok: false, message: 'Invalid bundle identifier format' };
      }
      return { ok: true, normalized };
    }
    case AssetType.API: {
      try {
        const u = new URL(id);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return { ok: false, message: 'API asset URL must use http or https' };
        }
      } catch {
        return { ok: false, message: 'Invalid API URL' };
      }
      return { ok: true, normalized };
    }
    case AssetType.REPOSITORY:
    case AssetType.CLOUD:
    case AssetType.THIRD_PARTY:
    case AssetType.PHYSICAL:
      return { ok: true, normalized };
    default:
      return { ok: false, message: 'Unknown asset type' };
  }
}
