import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 Starting profile promotion and database cleanup...');

  try {
    const targetEmail = 'smufaiz1111@gmail.com';
    let user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      console.log(`👤 User ${targetEmail} not found. Creating user...`);
      const hashedPassword = await bcrypt.hash('1234', 10);
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name: 'Sheikh Mufaiz',
          password: hashedPassword,
          role: 'WHOLESALER',
        },
      });
    } else {
      console.log(`👤 User ${targetEmail} found. Updating role to WHOLESALER...`);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'WHOLESALER' },
      });
    }

    const ourUserId = user.id;

    // 2. Ensure Wholesaler profile exists
    let wholesaler = await prisma.wholesaler.findUnique({
      where: { userId: ourUserId },
    });

    if (!wholesaler) {
      console.log('🏢 Creating Wholesaler profile...');
      wholesaler = await prisma.wholesaler.create({
        data: {
          userId: ourUserId,
          businessName: 'Mufaiz Wholesale Hub',
          businessPhone: '9876543210',
          businessAddress: 'Mufaiz Address',
          taxId: 'GST123456789',
        },
      });
    } else {
      console.log('🏢 Wholesaler profile already exists.');
    }

    const ourWholesalerId = wholesaler.id;

    // 3. Ensure Business Profile exists
    let businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: ourUserId },
    });

    if (!businessProfile) {
      console.log('💼 Creating Business Profile...');
      businessProfile = await prisma.businessProfile.create({
        data: {
          userId: ourUserId,
          companyName: 'Mufaiz Wholesale Hub',
          taxId: 'GST123456789',
          businessAddress: 'Mufaiz Address',
          status: 'ACTIVE',
        },
      });
    } else {
      console.log('💼 Business Profile already exists.');
    }

    // 4. Reassign products and their related logs
    console.log('📦 Reassigning products and logs...');
    const productUpdate = await prisma.product.updateMany({
      data: { wholesalerId: ourWholesalerId },
    });
    console.log(`📦 Reassigned ${productUpdate.count} products to Wholesaler ${ourWholesalerId}.`);

    const inventoryUpdate = await prisma.inventoryLog.updateMany({
      data: { wholesalerId: ourWholesalerId },
    });
    console.log(
      `📦 Reassigned ${inventoryUpdate.count} inventory logs to Wholesaler ${ourWholesalerId}.`
    );

    // 5. Clean up transactional dependency data in correct order
    console.log('🧹 Cleaning up transactional and dependency tables...');

    // Recommendation evaluations and events
    await prisma.recommendationEvaluationReport.deleteMany();
    await prisma.recommendationEvent.deleteMany();
    await prisma.recommendationInteraction.deleteMany();
    await prisma.recommendationLog.deleteMany();

    // Disputes
    await prisma.disputeResolution.deleteMany();
    await prisma.disputeEvidence.deleteMany();
    await prisma.disputeInternalNote.deleteMany();
    await prisma.disputeEvent.deleteMany();
    await prisma.dispute.deleteMany();

    // Orders and adjustments
    await prisma.orderAdjustment.deleteMany();
    await prisma.orderIssue.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    // Checkout sessions
    await prisma.prepaidCheckoutSession.deleteMany();

    // Ledger, accounts, offline transactions
    await prisma.ledgerEntry.deleteMany();
    await prisma.accountingEntry.deleteMany();
    await prisma.accountingAccount.deleteMany({
      where: { wholesalerId: { not: ourWholesalerId } },
    });

    await prisma.offlineSaleItem.deleteMany();
    await prisma.offlineSale.deleteMany();
    await prisma.offlinePurchaseItem.deleteMany();
    await prisma.offlinePurchase.deleteMany();
    await prisma.paymentInstrument.deleteMany();

    // Payouts, subscriptions, coupons, RFQs
    await prisma.wholesalerPayout.deleteMany();
    await prisma.wholesalerSubscription.deleteMany();
    await prisma.subscriptionPayment.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.rfq.deleteMany();

    // Carts, reviews, shipping addresses, business parties
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: { not: ourUserId } } },
    });
    await prisma.cart.deleteMany({
      where: { userId: { not: ourUserId } },
    });
    await prisma.b2BCartItem.deleteMany({
      where: { cart: { userId: { not: ourUserId } } },
    });
    await prisma.b2BCart.deleteMany({
      where: { userId: { not: ourUserId } },
    });
    await prisma.shippingAddress.deleteMany({
      where: { userId: { not: ourUserId } },
    });
    await prisma.businessParty.deleteMany();

    // Reviews not by our user
    await prisma.review.deleteMany({
      where: { userId: { not: ourUserId } },
    });

    // Notifications not for our user
    await prisma.notification.deleteMany({
      where: { userId: { not: ourUserId } },
    });

    // 6. Delete other Wholesalers and BusinessProfiles
    console.log('🧹 Deleting other Wholesaler and Business profiles...');
    await prisma.wholesaler.deleteMany({
      where: { id: { not: ourWholesalerId } },
    });
    await prisma.businessProfile.deleteMany({
      where: { userId: { not: ourUserId } },
    });

    // 7. Delete other Users (except ours and the Super Admin)
    console.log('👥 Deleting other user accounts...');
    const adminEmail = 'admin@example.com';
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        id: { not: ourUserId },
        email: { not: adminEmail },
      },
    });
    console.log(`👥 Deleted ${deleteUsers.count} other users.`);

    console.log('🎉 Cleanup and profile promotion completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup and promotion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
