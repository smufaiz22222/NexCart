export default async function seedIssues(prisma, orders) {
  console.log('⚠️ Seeding Return, Refund, and Dispute Issues...');

  const issueTypes = ['RETURN', 'REFUND', 'DISPUTE'];
  const issueStatuses = ['OPEN', 'IN_REVIEW', 'APPROVED', 'RESOLVED', 'REJECTED'];
  const resolutions = ['REFUND', 'STORE_CREDIT', 'REPLACEMENT', 'RETURNLESS_REFUND'];

  const reasons = [
    'Damaged during transit',
    'Received incorrect product variant',
    'Sizing was incorrect',
    'Poor product build quality',
    'Item stopped working after first use',
    'Missing accessories or parts',
  ];

  // We filter orders that have items
  const ordersWithItems = orders.filter((o) => o.items && o.items.length > 0);

  // Pick a subset of 8 orders to create issues for
  const selectedOrders = ordersWithItems.slice(0, Math.min(8, ordersWithItems.length));

  for (let i = 0; i < selectedOrders.length; i++) {
    const order = selectedOrders[i];
    const item = order.items[0]; // Raise issue on the first item

    const type = issueTypes[i % issueTypes.length];
    const status = issueStatuses[i % issueStatuses.length];
    const preferredResolution = resolutions[i % resolutions.length];

    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const description = `This is a demo order issue raised for testing. Customer reported: ${reason.toLowerCase()}.`;

    const requestedQuantity = Math.min(item.quantity, 1);
    const refundAmount = Number(item.price) * requestedQuantity;

    const isResolved = status === 'RESOLVED' || status === 'APPROVED';
    const finalResolution = isResolved ? preferredResolution : 'NONE';
    const inventoryAdjusted =
      isResolved &&
      (finalResolution === 'RETURN' ||
        finalResolution === 'REFUND' ||
        finalResolution === 'REPLACEMENT');

    const issue = await prisma.orderIssue.create({
      data: {
        orderId: order.id,
        orderItemId: item.id,
        requesterId: order.buyerId,
        type,
        status,
        preferredResolution,
        finalResolution,
        reason,
        description,
        requestedQuantity,
        refundAmount,
        inventoryAdjusted,
        sellerResponse: isResolved
          ? 'Issue reviewed. Requested resolution approved and processed.'
          : null,
        resolvedAt: isResolved ? new Date() : null,
      },
    });

    // If resolved and inventory is adjusted, reverse transaction in logs
    if (inventoryAdjusted) {
      // 1. Log return credit in customer ledger
      await prisma.ledgerEntry.create({
        data: {
          wholesalerId: order.sellerId,
          userId: order.buyerId,
          amount: refundAmount,
          description: `Refund credit for Issue #${issue.id.slice(0, 8).toUpperCase()}`,
          referenceId: order.id,
        },
      });

      // 2. Add item back to product inventory logs
      await prisma.inventoryLog.create({
        data: {
          wholesalerId: order.sellerId,
          productId: item.productId,
          changeAmount: requestedQuantity,
          reason: 'CUSTOMER_RETURN',
        },
      });

      // 3. Increment stock on product
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: requestedQuantity } },
      });
    }
  }

  console.log(`✅ Successfully seeded order issues, return logs, and ledger refunds.`);
}
