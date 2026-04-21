import { prisma } from '@bughuntr/db';
import type {
  SearchAssetsQuery,
  SearchProgramsQuery,
  SearchReportsQuery,
  SearchResearchersQuery,
} from './search.schemas.js';

function toUtcRange(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom
    ? new Date(Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), dateFrom.getUTCDate(), 0, 0, 0, 0))
    : undefined;
  const to = dateTo
    ? new Date(Date.UTC(dateTo.getUTCFullYear(), dateTo.getUTCMonth(), dateTo.getUTCDate(), 23, 59, 59, 999))
    : undefined;
  return { from, to };
}

export class SearchService {
  static async searchReports(userId: string, query: SearchReportsQuery) {
    const { from, to } = toUtcRange(query.dateFrom, query.dateTo);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        status: string;
        severityValidated: string | null;
        createdAt: Date;
        programSlug: string;
        assetIdentifier: string | null;
        researcher: string;
      }>
    >`
      SELECT r.id, r.title, r.status, r."severityValidated", r."createdAt",
             p.slug as "programSlug", a.identifier as "assetIdentifier", u.username as researcher
      FROM "Report" r
      JOIN "Program" p ON p.id = r."programId"
      JOIN "User" u ON u.id = r."submitterId"
      LEFT JOIN "Asset" a ON a.id = r."assetId"
      LEFT JOIN "Reward" rw ON rw."reportId" = r.id
      LEFT JOIN "Payout" py ON py."rewardId" = rw.id
      WHERE (
        p.type = 'PUBLIC' AND p.status = 'ACTIVE'
        OR EXISTS (
          SELECT 1 FROM "OrganizationMember" om WHERE om."orgId" = p."orgId" AND om."userId" = ${userId}
        )
        OR EXISTS (
          SELECT 1 FROM "ProgramInvite" pi WHERE pi."programId" = p.id AND pi."userId" = ${userId} AND pi."usedAt" IS NOT NULL
        )
      )
      AND (${query.q ?? null}::text IS NULL OR (
         to_tsvector('english', coalesce(r.title,'') || ' ' || coalesce(r."impactExplanation",'')) @@ plainto_tsquery('english', ${query.q ?? ''})
         OR r.title ILIKE ${`%${query.q ?? ''}%`}
         OR r."impactExplanation" ILIKE ${`%${query.q ?? ''}%`}
      ))
      AND (${query.status ?? null}::text IS NULL OR r.status::text = ${query.status ?? ''})
      AND (${query.severity ?? null}::text IS NULL OR r."severityValidated"::text = ${query.severity ?? ''})
      AND (${query.program ?? null}::text IS NULL OR p.slug = ${query.program ?? ''})
      AND (${query.asset ?? null}::text IS NULL OR a.identifier ILIKE ${`%${query.asset ?? ''}%`})
      AND (${query.researcher ?? null}::text IS NULL OR u.username ILIKE ${`%${query.researcher ?? ''}%`})
      AND (${from ?? null}::timestamptz IS NULL OR r."createdAt" >= ${from ?? null})
      AND (${to ?? null}::timestamptz IS NULL OR r."createdAt" <= ${to ?? null})
      AND (${query.isDuplicate ?? null}::text IS NULL OR r."isDuplicate" = ${query.isDuplicate === 'true'})
      AND (${query.hasSlaBreached ?? null}::text IS NULL OR EXISTS (
         SELECT 1 FROM "SlaRecord" sr WHERE sr."reportId" = r.id AND sr.breached = ${query.hasSlaBreached === 'true'}
      ))
      AND (${query.payoutStatus ?? null}::text IS NULL OR py.status::text = ${query.payoutStatus ?? ''})
      AND (${query.cursor ?? null}::text IS NULL OR r.id < ${query.cursor ?? ''})
      ORDER BY r.id DESC
      LIMIT ${query.take}
    `;
    return {
      items: rows,
      nextCursor: rows.length === query.take ? rows[rows.length - 1]?.id : null,
    };
  }

  static async searchPrograms(query: SearchProgramsQuery) {
    const programs = await prisma.program.findMany({
      where: {
        deletedAt: null,
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        org: { select: { slug: true, name: true } },
      },
      orderBy: { id: 'desc' },
      take: query.take,
    });
    return {
      items: programs,
      nextCursor: programs.length === query.take ? programs[programs.length - 1]?.id : null,
    };
  }

  static async searchResearchers(query: SearchResearchersQuery) {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        bannedAt: null,
        ...(query.q
          ? {
              OR: [
                { username: { contains: query.q, mode: 'insensitive' } },
                { displayName: { contains: query.q, mode: 'insensitive' } },
                { bio: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.country ? { country: query.country.toUpperCase() } : {}),
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        country: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take: query.take,
    });
    return {
      items: users,
      nextCursor: users.length === query.take ? users[users.length - 1]?.id : null,
    };
  }

  static async searchAssets(query: SearchAssetsQuery) {
    const assets = await prisma.asset.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { identifier: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.program ? { program: { slug: query.program } } : {}),
        ...(query.inScope ? { inScope: query.inScope === 'true' } : {}),
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      select: {
        id: true,
        identifier: true,
        type: true,
        inScope: true,
        verified: true,
        program: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { id: 'desc' },
      take: query.take,
    });
    return {
      items: assets,
      nextCursor: assets.length === query.take ? assets[assets.length - 1]?.id : null,
    };
  }
}
