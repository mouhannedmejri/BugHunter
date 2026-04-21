import * as dns from 'node:dns/promises';
import type { Job } from 'bullmq';
import cidrRegex from 'cidr-regex';
import { prisma, AssetType } from '@bughuntr/db';
import {
  normalizeWildcardIdentifier,
  validateAssetIdentifierFormat,
} from '@bughuntr/shared';

const cidrExact = cidrRegex({ exact: true });

export interface AssetVerificationJobData {
  assetId: string;
}

async function verifyAssetRecord(asset: {
  id: string;
  type: AssetType;
  identifier: string;
}): Promise<boolean> {
  switch (asset.type) {
    case AssetType.DOMAIN:
    case AssetType.SUBDOMAIN: {
      const n = normalizeWildcardIdentifier(asset.identifier);
      if (!n.dnsHost) return false;
      try {
        await dns.lookup(n.dnsHost);
        return true;
      } catch {
        return false;
      }
    }
    case AssetType.IP_RANGE:
      return cidrExact.test(asset.identifier.trim());
    case AssetType.MOBILE_APP:
      return validateAssetIdentifierFormat(AssetType.MOBILE_APP, asset.identifier).ok;
    case AssetType.API:
      return validateAssetIdentifierFormat(AssetType.API, asset.identifier).ok;
    case AssetType.REPOSITORY:
    case AssetType.CLOUD:
    case AssetType.THIRD_PARTY:
    case AssetType.PHYSICAL:
      return asset.identifier.trim().length > 0;
    default:
      return false;
  }
}

export async function processAssetVerificationJob(
  job: Job<AssetVerificationJobData>,
): Promise<void> {
  const asset = await prisma.asset.findFirst({
    where: { id: job.data.assetId, deletedAt: null },
  });
  if (!asset) {
    job.log(`Asset ${job.data.assetId} not found or deleted`);
    return;
  }

  const ok = await verifyAssetRecord(asset);
  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      verified: ok,
      verifiedAt: ok ? new Date() : null,
    },
  });
}
