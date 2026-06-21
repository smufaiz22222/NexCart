import { prisma } from '../src/config/db.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      wholesalerProfile: {
        select: {
          id: true,
          businessName: true,
        },
      },
      businessProfile: {
        select: {
          id: true,
          companyName: true,
        },
      },
    },
  });

  console.log('ALL USERS:');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
