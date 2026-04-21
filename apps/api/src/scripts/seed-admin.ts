import { prisma, PlatformRole } from '@bughuntr/db';
import { hashPassword } from '../lib/password.js';

async function main() {
  console.log('Seeding default administrator...');
  const defaultAdminEmail = 'admin@bughuntr.com';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: defaultAdminEmail }
  });

  if (existingAdmin) {
    console.log('Admin already exists.');
    return;
  }

  const passwordHash = await hashPassword('Admin123!');

  await prisma.user.create({
    data: {
      email: defaultAdminEmail,
      username: 'admin',
      displayName: 'System Admin',
      platformRole: PlatformRole.SUPER_ADMIN,
      passwordHash,
      emailVerifiedAt: new Date()
    }
  });

  console.log('Created default Super Admin successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
