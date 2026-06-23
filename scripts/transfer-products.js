import 'dotenv/config';
import { prisma } from '../src/config/db.js';

/**
 * Transfer all products to two wholesaler accounts, split evenly (half each).
 * Then remove all other wholesaler accounts.
 *
 * Target accounts:
 *  - smufaiz1111@gmail.com
 *  - smufaiz1234@gmail.com
 */
async function main() {
  const TARGET_EMAILS = ['smufaiz1111@gmail.com', 'smufaiz1234@gmail.com'];

  console.log('🔍 Looking up target wholesaler accounts...');

  // 1. Find target users and their wholesaler profiles
  const targetUsers = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    include: { wholesalerProfile: true },
  });

  if (targetUsers.length !== 2) {
    console.error(
      `❌ Expected 2 target accounts, found ${targetUsers.length}. Emails found:`,
      targetUsers.map((u) => u.email)
    );
    process.exit(1);
  }

  const user1 = targetUsers.find((u) => u.email === TARGET_EMAILS[0]);
  const user2 = targetUsers.find((u) => u.email === TARGET_EMAILS[1]);

  if (!user1.wholesalerProfile || !user2.wholesalerProfile) {
    console.error('❌ One or both target users do not have a wholesaler profile.');
    console.error(`  ${user1.email}: wholesalerProfile = ${!!user1.wholesalerProfile}`);
    console.error(`  ${user2.email}: wholesalerProfile = ${!!user2.wholesalerProfile}`);
    process.exit(1);
  }

  const wId1 = user1.wholesalerProfile.id;
  const wId2 = user2.wholesalerProfile.id;

  console.log(`✅ Target 1: ${user1.email} → Wholesaler ID: ${wId1}`);
  console.log(`✅ Target 2: ${user2.email} → Wholesaler ID: ${wId2}`);

  // 2. Get all products
  const allProducts = await prisma.product.findMany({
    orderBy: { category: 'asc' },
    select: { id: true, name: true, category: true, wholesalerId: true },
  });

  console.log(`\n📦 Total products found: ${allProducts.length}`);

  // 3. Split products evenly - first half to account 1, second half to account 2
  const midpoint = Math.ceil(allProducts.length / 2);
  const batch1 = allProducts.slice(0, midpoint);
  const batch2 = allProducts.slice(midpoint);

  console.log(`  → ${batch1.length} products → ${user1.email}`);
  console.log(`  → ${batch2.length} products → ${user2.email}`);

  // 4. Update products in a transaction
  console.log('\n🔄 Transferring products...');

  await prisma.$transaction([
    prisma.product.updateMany({
      where: { id: { in: batch1.map((p) => p.id) } },
      data: { wholesalerId: wId1 },
    }),
    prisma.product.updateMany({
      where: { id: { in: batch2.map((p) => p.id) } },
      data: { wholesalerId: wId2 },
    }),
  ]);

  console.log('✅ Products transferred successfully!');

  // 5. Get all other wholesalers (not the two targets)
  const otherWholesalers = await prisma.wholesaler.findMany({
    where: { id: { notIn: [wId1, wId2] } },
    include: { user: true },
  });

  console.log(`\n🗑️  Found ${otherWholesalers.length} other wholesaler accounts to remove.`);

  if (otherWholesalers.length > 0) {
    // Remove related data for other wholesalers before deleting them
    const otherWIds = otherWholesalers.map((w) => w.id);
    const otherUserIds = otherWholesalers.map((w) => w.userId);

    console.log('  Cleaning up related records for other wholesalers...');

    // Delete dependent records in correct order (child records first)
    // OfflineSaleItem and OfflinePurchaseItem cascade from their parent, so delete parents directly.
    // PaymentInstrument references OfflineSale, so delete it before OfflineSale.
    // AccountingEntry references OfflineSale/OfflinePurchase, so delete it first.

    await prisma.accountingEntry.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.paymentInstrument.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.offlineSale.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.offlinePurchase.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.accountingAccount.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.businessParty.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.invoice.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.wholesalerPayout.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.subscriptionPayment.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.wholesalerSubscription.deleteMany({ where: { wholesalerId: { in: otherWIds } } });
    await prisma.rfq.deleteMany({ where: { sellerId: { in: otherWIds } } });

    // Handle orders that reference other wholesalers as sellers
    // Update orders to point to one of the target wholesalers
    await prisma.order.updateMany({
      where: { sellerId: { in: otherWIds } },
      data: { sellerId: wId1 },
    });

    // Handle disputes linked to other wholesalers
    await prisma.dispute.updateMany({
      where: { sellerId: { in: otherWIds } },
      data: { sellerId: wId1 },
    });

    // Now delete the wholesaler profiles
    await prisma.wholesaler.deleteMany({
      where: { id: { in: otherWIds } },
    });

    // Update the user roles of former wholesalers (optional - change to CUSTOMER or delete)
    await prisma.user.deleteMany({
      where: { id: { in: otherUserIds } },
    });

    console.log(`✅ Removed ${otherWholesalers.length} other wholesaler accounts and their users.`);
  }

  // 6. Final verification
  const finalCount1 = await prisma.product.count({ where: { wholesalerId: wId1 } });
  const finalCount2 = await prisma.product.count({ where: { wholesalerId: wId2 } });
  const totalWholesalers = await prisma.wholesaler.count();

  console.log('\n📊 Final state:');
  console.log(`  ${user1.email}: ${finalCount1} products`);
  console.log(`  ${user2.email}: ${finalCount2} products`);
  console.log(`  Total wholesalers remaining: ${totalWholesalers}`);
  console.log('\n🎉 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
