export default async function cleanDb(prisma) {
  console.log('🧹 Sweeping old data...');

  // Delete records in reverse dependency order
  await prisma.recommendationEvaluationReport.deleteMany();
  await prisma.recommendationEvent.deleteMany();
  await prisma.recommendationInteraction.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.productSimilarity.deleteMany();
  await prisma.productFeature.deleteMany();

  await prisma.prepaidCheckoutSession.deleteMany();
  await prisma.orderIssue.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.wholesaler.deleteMany();
  await prisma.user.deleteMany();

  console.log('✨ Database swept clean.');
}
