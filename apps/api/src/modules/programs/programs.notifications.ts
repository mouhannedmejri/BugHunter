import { prisma, NotifChannel, PlatformRole } from '@bughuntr/db';

/**
 * Notify all platform researchers (USER) when a PUBLIC program goes ACTIVE.
 */
export async function notifyResearchersProgramLaunched(params: {
  programId: string;
  programSlug: string;
  title: string;
}): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;

  const users = await prisma.user.findMany({
    where: {
      platformRole: PlatformRole.USER,
      deletedAt: null,
      bannedAt: null,
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  const body = `A new public program "${params.title}" is now accepting submissions.`;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: 'PROGRAM_LAUNCHED',
      channel: NotifChannel.IN_APP,
      subject: `New program: ${params.title}`,
      body,
      data: {
        programId: params.programId,
        programSlug: params.programSlug,
      } as object,
    })),
  });
}

/**
 * Notify accepted invitees + anyone who submitted reports when program closes.
 */
export async function notifyProgramClosedParticipants(params: {
  programId: string;
  programSlug: string;
  title: string;
}): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return;

  const [invites, submitters] = await Promise.all([
    prisma.programInvite.findMany({
      where: {
        programId: params.programId,
        userId: { not: null },
        usedAt: { not: null },
      },
      select: { userId: true },
    }),
    prisma.report.findMany({
      where: { programId: params.programId },
      select: { submitterId: true },
      distinct: ['submitterId'],
    }),
  ]);

  const userIds = new Set<string>();
  for (const i of invites) {
    if (i.userId) userIds.add(i.userId);
  }
  for (const s of submitters) {
    userIds.add(s.submitterId);
  }

  const body = `The program "${params.title}" has been closed. Thank you for participating.`;
  const data = {
    programId: params.programId,
    programSlug: params.programSlug,
  } as object;

  if (userIds.size === 0) return;

  await prisma.notification.createMany({
    data: [...userIds].map((userId) => ({
      userId,
      type: 'PROGRAM_CLOSED',
      channel: NotifChannel.IN_APP,
      subject: `Program closed: ${params.title}`,
      body,
      data,
    })),
  });
}
