import { prisma } from '../src/config/db.js';

async function main() {
  console.log('Cleaning up database tables...');
  await prisma.recommendationEvent.deleteMany();
  await prisma.recommendationInteraction.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.orderIssue.deleteMany();
  await prisma.disputeEvidence.deleteMany();
  await prisma.disputeInternalNote.deleteMany();
  await prisma.disputeEvent.deleteMany();
  await prisma.disputeResolution.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.orderAdjustment.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryLog.deleteMany();
  console.log('Cleanup finished successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
