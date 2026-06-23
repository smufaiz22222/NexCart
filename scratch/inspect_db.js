import { prisma } from '../src/config/db.js';

async function main() {
  console.log('--- Database Inspection ---');
  try {
    const userCount = await prisma.user.count();
    const wholesalerCount = await prisma.wholesaler.count();
    const businessProfileCount = await prisma.businessProfile.count();
    const productCount = await prisma.product.count();

    console.log(`Users: ${userCount}`);
    console.log(`Wholesalers: ${wholesalerCount}`);
    console.log(`Business Profiles: ${businessProfileCount}`);
    console.log(`Products: ${productCount}`);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
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

    console.log('\nUsers detail:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error inspecting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
