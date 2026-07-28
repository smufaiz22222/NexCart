import { prisma } from '../src/config/db.js';

async function main() {
  const rfqs = await prisma.rfq.findMany({
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, businessName: true } },
      product: { select: { id: true, name: true } },
    },
  });

  console.log('ALL RFQs in DB:');
  console.log(JSON.stringify(rfqs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
