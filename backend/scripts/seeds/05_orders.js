import { faker } from '@faker-js/faker';

export default async function seedOrders(prisma, customers, products) {
  console.log('🛒 Seeding Orders, Invoices, sales Logs, and Ledgers...');

  const orderStatuses = ['DELIVERED', 'DELIVERED', 'SHIPPED', 'PROCESSING', 'PENDING'];
  const paymentMethods = ['COD', 'PREPAID'];

  // Exclude Alice Admin (role: SUPER_ADMIN) if any, we only want CUSTOMER users
  const customerUsers = customers.filter((c) => c.role === 'CUSTOMER');

  // We want to group products by wholesaler so we can create orders with items from the same wholesaler
  const productsByWholesaler = new Map();
  for (const product of products) {
    const list = productsByWholesaler.get(product.wholesalerId) || [];
    list.push(product);
    productsByWholesaler.set(product.wholesalerId, list);
  }

  const wholesalerIds = Array.from(productsByWholesaler.keys());
  const seededOrders = [];

  // Initialize some customer ledger profiles with initial deposit credits (e.g. $5,000 credit)
  console.log('  - Granting initial deposit credits to customers in wholesaler ledgers...');
  const initialCredits = [];
  for (const customer of customerUsers.slice(0, 25)) {
    // First 25 customers get profiles
    for (const wholesalerId of wholesalerIds.slice(0, 3)) {
      // Spread across first 3 wholesalers
      initialCredits.push({
        wholesalerId,
        userId: customer.id,
        amount: 5000.0,
        description: 'Initial deposit credit line granted.',
      });
    }
  }
  await prisma.ledgerEntry.createMany({ data: initialCredits });

  console.log('  - Creating 35 realistic sales orders...');
  for (let i = 0; i < 35; i++) {
    // 1. Pick a random customer
    const customer = customerUsers[Math.floor(Math.random() * customerUsers.length)];

    // 2. Pick a random wholesaler who has products
    const wholesalerId = wholesalerIds[Math.floor(Math.random() * wholesalerIds.length)];
    const wholesalerProducts = productsByWholesaler.get(wholesalerId);

    // 3. Pick 1 to 3 distinct products from this wholesaler
    const shuffledProducts = [...wholesalerProducts].sort(() => 0.5 - Math.random());
    const itemsCount = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = shuffledProducts.slice(
      0,
      Math.min(itemsCount, shuffledProducts.length)
    );

    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    let paymentStatus = 'PENDING';
    if (status === 'DELIVERED') {
      paymentStatus = 'PAID';
    } else if (status === 'SHIPPED' && paymentMethod === 'PREPAID') {
      paymentStatus = 'PAID';
    }

    // Generate items metadata
    const orderItemsData = selectedProducts.map((p) => {
      const quantity = Math.floor(Math.random() * 5) + 1;
      return {
        productId: p.id,
        price: p.price,
        quantity,
        totalItemPrice: p.price * quantity,
      };
    });

    const totalAmount = orderItemsData.reduce((sum, item) => sum + item.totalItemPrice, 0);

    // Create Order (must use create to get ID back)
    const order = await prisma.order.create({
      data: {
        sellerId: wholesalerId,
        buyerId: customer.id,
        status,
        paymentMethod,
        paymentStatus,
        totalAmount,
        shippingAddress: `${customer.name}, ${faker.location.streetAddress()}, ${faker.location.city()}`,
      },
    });

    // Create Order Items
    await prisma.orderItem.createMany({
      data: orderItemsData.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    // Create Invoice
    await prisma.invoice.create({
      data: {
        wholesalerId,
        orderId: order.id,
        amount: totalAmount,
      },
    });

    // Create purchase LedgerEntry (customer pays/debits the wholesaler)
    await prisma.ledgerEntry.create({
      data: {
        wholesalerId,
        userId: customer.id,
        amount: -totalAmount,
        description: `Order Purchase #${order.id.slice(0, 8).toUpperCase()}`,
        referenceId: order.id,
      },
    });

    // Create sale InventoryLogs (reduce inventory)
    const saleLogs = orderItemsData.map((item) => ({
      wholesalerId,
      productId: item.productId,
      changeAmount: -item.quantity,
      reason: 'SALE',
    }));
    await prisma.inventoryLog.createMany({ data: saleLogs });

    // Decrement actual product stock
    for (const item of orderItemsData) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
    }

    // Load order items with product context for return issues seeding
    const dbOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { product: true } } },
    });

    seededOrders.push(dbOrder);
  }

  console.log(
    `✅ Successfully seeded ${seededOrders.length} orders, items, invoices, inventory sale logs, and ledger entries.`
  );
  return seededOrders;
}
