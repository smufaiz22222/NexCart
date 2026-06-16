import { faker } from '@faker-js/faker';

export default async function seedCheckout(prisma, customers) {
  console.log('💳 Seeding Prepaid Checkout Sessions...');

  const paymentStatuses = ['PAID', 'PAID', 'PENDING', 'FAILED'];
  const customerUsers = customers.filter((c) => c.role === 'CUSTOMER');

  const checkoutSessions = [];

  for (let i = 0; i < 10; i++) {
    const customer = customerUsers[Math.floor(Math.random() * customerUsers.length)];
    const status = paymentStatuses[i % paymentStatuses.length];
    const amount = faker.number.float({ min: 100, max: 8000, fractionDigits: 2 });
    const razorpayOrderId = `order_${faker.string.alphanumeric(14)}`;

    let paymentReference = null;
    if (status === 'PAID') {
      paymentReference = `pay_${faker.string.alphanumeric(14)}`;
    }

    const payload = {
      notes: {
        integration: 'Razorpay',
        customer_email: customer.email,
        agent: 'NexCart Checkout Pipeline',
      },
      receipt: `receipt_${faker.string.alphanumeric(8)}`,
      attempts: status === 'FAILED' ? 2 : 1,
    };

    checkoutSessions.push({
      buyerId: customer.id,
      razorpayOrderId,
      amount,
      currency: 'INR',
      payload,
      paymentStatus: status,
      paymentReference,
    });
  }

  await prisma.prepaidCheckoutSession.createMany({ data: checkoutSessions });
  console.log(`✅ Successfully seeded ${checkoutSessions.length} prepaid checkout sessions.`);
}
