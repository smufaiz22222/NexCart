import { prisma } from '../src/config/db.js';

async function check() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('--- RECENT USERS ---');
  console.log(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    }))
  );

  const otps = await prisma.emailOTP.findMany();
  console.log('\n--- ACTIVE OTPS ---');
  console.log(otps.map((o) => ({ email: o.email, purpose: o.purpose, expiresAt: o.expiresAt })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
