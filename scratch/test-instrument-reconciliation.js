import { prisma } from '../src/config/db.js';
import {
  createOfflineSale,
  createOfflinePurchase,
  reconcileInstrument,
  recordPartyTransaction,
} from '../src/services/accountingService.js';

async function runTests() {
  console.log('--- Starting Ledger & Reconciliation Tests ---');

  // 1. Fetch a Wholesaler
  const wholesaler = await prisma.wholesaler.findFirst({
    include: {
      user: true,
    },
  });
  if (!wholesaler) {
    console.error('No wholesaler found in the database. Run seed script first.');
    process.exit(1);
  }
  const wholesalerId = wholesaler.id;
  console.log(`Using wholesaler: ${wholesalerId} (${wholesaler.companyName})`);

  // 2. Fetch or create a BusinessParty
  let party = await prisma.businessParty.findFirst({
    where: { wholesalerId },
  });
  if (!party) {
    party = await prisma.businessParty.create({
      data: {
        wholesalerId,
        name: 'Test Supplier Customer Corp',
        type: 'BOTH',
        phone: '1234567890',
        email: 'testparty@example.com',
      },
    });
    console.log(`Created new party: ${party.id}`);
  } else {
    console.log(`Using existing party: ${party.id} (${party.name})`);
  }

  // 3. Fetch or create a Product
  let product = await prisma.product.findFirst({
    where: { wholesalerId },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        wholesalerId,
        name: 'Test Widget Pro',
        sku: 'TEST-WIDGET-001',
        description: 'Test widget for OCR and Ledger verification',
        price: 100.0,
        currentStock: 50,
      },
    });
    console.log(`Created new product: ${product.id} (Stock: 50)`);
  } else {
    console.log(
      `Using existing product: ${product.id} (${product.name}, Stock: ${product.currentStock})`
    );
  }

  // Preserve initial stock
  const initialStock = product.currentStock;

  // 4. Create an Offline Sale for a party (expected to be 100% credit)
  console.log('\n--- Creating Decoupled Offline Sale (Credit) ---');
  const saleInvoice = `SALE-TEST-${Date.now().toString().slice(-4)}`;
  const resultSale = await createOfflineSale({
    wholesalerId,
    invoiceNumber: saleInvoice,
    partyId: party.id,
    notes: 'Credit sale test',
    items: [
      {
        productId: product.id,
        quantity: '3',
        unitPrice: '100.00',
      },
    ],
  });

  const sale = resultSale.sale;
  console.log(`Offline sale created: ${sale.id}. Invoice: ${sale.invoiceNumber}`);
  console.log(
    `Sale details -> totalAmount: ${sale.totalAmount}, amountReceived: ${sale.amountReceived}, balanceDue: ${sale.balanceDue}`
  );

  if (Number(sale.amountReceived) !== 0 || Number(sale.balanceDue) !== Number(sale.totalAmount)) {
    throw new Error(
      'Expected party sale to be 100% credit (amountReceived: 0, balanceDue: totalAmount)!'
    );
  }

  // Check product stock decremented
  const updatedProductAfterSale = await prisma.product.findUnique({
    where: { id: product.id },
  });
  console.log(
    `Stock level after sale (expected ${initialStock - 3}): ${updatedProductAfterSale.currentStock}`
  );
  if (updatedProductAfterSale.currentStock !== initialStock - 3) {
    throw new Error('Stock did not decrement correctly after sale!');
  }

  // Check no PaymentInstrument is created automatically
  const autoInstrument = await prisma.paymentInstrument.findFirst({
    where: {
      wholesalerId,
      offlineSaleId: sale.id,
    },
  });
  if (autoInstrument) {
    throw new Error(
      'Payment instrument should not be created automatically for a credit party sale!'
    );
  }
  console.log('Verified: No payment instrument created automatically for credit sale.');

  // Check Accounting entries for credit sale
  const receivableEntry = await prisma.accountingEntry.findFirst({
    where: {
      wholesalerId,
      offlineSaleId: sale.id,
      account: { code: 'RECEIVABLE' },
    },
  });
  if (!receivableEntry || Number(receivableEntry.amount) !== Number(sale.totalAmount)) {
    throw new Error('Could not find correct accounting entry for RECEIVABLE!');
  }
  console.log(`Accounting Entry to RECEIVABLE: Amount: ${receivableEntry.amount}`);

  // 5. Record a separate payment for the party (using a cheque)
  console.log('\n--- Recording Separate Party Payment (Cheque Awaiting Clearance) ---');
  const chqNumber = `CHQ-${Date.now().toString().slice(-6)}`;
  await recordPartyTransaction({
    wholesalerId,
    partyId: party.id,
    amount: '300.00',
    direction: 'IN',
    paymentMethod: 'CHEQUE',
    description: `Payment for invoice ${sale.invoiceNumber}`,
    referenceId: sale.id,
    instrumentNumber: chqNumber,
    bankName: 'HDFC Bank',
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // tomorrow
    awaitingClearance: true,
  });

  console.log('Payment recorded successfully.');

  // Check PaymentInstrument is created and PENDING
  const instrument = await prisma.paymentInstrument.findFirst({
    where: {
      wholesalerId,
      partyId: party.id,
      instrumentNumber: chqNumber,
    },
  });
  if (!instrument) {
    throw new Error('Payment instrument was not created for the cheque payment!');
  }
  console.log(
    `Instrument created. ID: ${instrument.id}, Status: ${instrument.status}, Type: ${instrument.type}`
  );
  if (instrument.status !== 'PENDING') {
    throw new Error(`Expected instrument status to be PENDING, got ${instrument.status}`);
  }

  // Check no accounting entries exist for pending manual payment before clearance
  const pendingAccountingEntry = await prisma.accountingEntry.findFirst({
    where: {
      wholesalerId,
      referenceId: instrument.id,
    },
  });
  if (pendingAccountingEntry) {
    throw new Error(
      'Expected no accounting entries for pending party payment instrument before clearance!'
    );
  }
  console.log('Verified: No accounting entry recorded for pending cheque before clearance.');

  // 6. Reconcile/Clear the Cheque
  console.log('\n--- Reconciling Instrument (Cheque Clearance) ---');
  const reconciliationResult = await reconcileInstrument({
    wholesalerId,
    instrumentId: instrument.id,
  });
  console.log('Reconciliation successful. Instrument status:', reconciliationResult.status);

  // Check instrument status updated to CLEARED
  const updatedInstrument = await prisma.paymentInstrument.findUnique({
    where: { id: instrument.id },
  });
  console.log(`Instrument Status after reconciliation: ${updatedInstrument.status}`);
  if (updatedInstrument.status !== 'CLEARED') {
    throw new Error(`Expected instrument status to be CLEARED, got ${updatedInstrument.status}`);
  }

  // Check clearing accounting entries: Debit BANK, Credit RECEIVABLE
  const entriesAfterReconciliation = await prisma.accountingEntry.findMany({
    where: {
      wholesalerId,
      referenceId: updatedInstrument.id,
    },
    include: {
      account: true,
    },
  });
  console.log('Clearing Entries:');
  for (const entry of entriesAfterReconciliation) {
    console.log(
      ` - Account: ${entry.account.code} (${entry.account.category}), Amount: ${entry.amount}`
    );
  }
  if (entriesAfterReconciliation.length !== 2) {
    throw new Error(`Expected 2 clearing entries, got ${entriesAfterReconciliation.length}`);
  }
  const bankClearedEntry = entriesAfterReconciliation.find((e) => e.account.code === 'BANK');
  const receivableClearedEntry = entriesAfterReconciliation.find(
    (e) => e.account.code === 'RECEIVABLE'
  );
  if (!bankClearedEntry || Number(bankClearedEntry.amount) !== 300) {
    throw new Error('Expected 300.00 debited to BANK!');
  }
  if (!receivableClearedEntry || Number(receivableClearedEntry.amount) !== -300) {
    throw new Error('Expected 300.00 credited to RECEIVABLE!');
  }
  console.log('Verified: Clear entries successfully debited BANK and credited RECEIVABLE.');

  // 7. Create Offline Purchase for a party (expected to be 100% credit)
  console.log('\n--- Creating Decoupled Offline Purchase (Credit) ---');
  const purchaseInvoice = `PUR-TEST-${Date.now().toString().slice(-4)}`;
  const resultPurchase = await createOfflinePurchase({
    wholesalerId,
    invoiceNumber: purchaseInvoice,
    partyId: party.id,
    notes: 'Credit purchase test',
    items: [
      {
        productId: product.id,
        quantity: '5',
        unitPrice: '100.00',
      },
    ],
  });

  const purchase = resultPurchase.purchase;
  console.log(`Offline purchase created: ${purchase.id}. Invoice: ${purchase.invoiceNumber}`);
  console.log(
    `Purchase details -> totalAmount: ${purchase.totalAmount}, amountPaid: ${purchase.amountPaid}, balanceDue: ${purchase.balanceDue}`
  );

  if (
    Number(purchase.amountPaid) !== 0 ||
    Number(purchase.balanceDue) !== Number(purchase.totalAmount)
  ) {
    throw new Error(
      'Expected party purchase to be 100% credit (amountPaid: 0, balanceDue: totalAmount)!'
    );
  }

  // Check product stock incremented (50 - 3 + 5 = 52)
  const finalProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });
  console.log(
    `Stock level after purchase (expected ${updatedProductAfterSale.currentStock + 5}): ${finalProduct.currentStock}`
  );
  if (finalProduct.currentStock !== updatedProductAfterSale.currentStock + 5) {
    throw new Error('Stock did not increment correctly after purchase!');
  }

  // Verify inventory log OCR_UPDATE exists
  const invLog = await prisma.inventoryLog.findFirst({
    where: {
      wholesalerId,
      productId: product.id,
      reason: 'OCR_UPDATE',
      changeAmount: 5,
    },
  });
  if (!invLog) {
    throw new Error('No InventoryLog of reason OCR_UPDATE found!');
  }
  console.log(
    `Found InventoryLog: ID: ${invLog.id}, Reason: ${invLog.reason}, Change: ${invLog.changeAmount}`
  );

  // 8. Create Walk-in Cash Sale (no partyId)
  console.log('\n--- Creating Walk-in Cash Sale ---');
  const walkinSaleInvoice = `SALE-CASH-${Date.now().toString().slice(-4)}`;
  const resultWalkinSale = await createOfflineSale({
    wholesalerId,
    invoiceNumber: walkinSaleInvoice,
    partyId: null,
    paymentMethod: 'CASH',
    notes: 'Walk-in cash sale test',
    items: [
      {
        productId: product.id,
        quantity: '2',
        unitPrice: '100.00',
      },
    ],
  });

  const walkinSale = resultWalkinSale.sale;
  console.log(`Walk-in sale created: ${walkinSale.id}. Invoice: ${walkinSale.invoiceNumber}`);
  console.log(
    `Walk-in sale details -> totalAmount: ${walkinSale.totalAmount}, amountReceived: ${walkinSale.amountReceived}, balanceDue: ${walkinSale.balanceDue}`
  );

  if (
    Number(walkinSale.amountReceived) !== Number(walkinSale.totalAmount) ||
    Number(walkinSale.balanceDue) !== 0
  ) {
    throw new Error(
      'Expected walk-in sale to be 100% cash paid (amountReceived: totalAmount, balanceDue: 0)!'
    );
  }

  const cashEntry = await prisma.accountingEntry.findFirst({
    where: {
      wholesalerId,
      offlineSaleId: walkinSale.id,
      account: { code: 'CASH' },
    },
  });
  if (!cashEntry || Number(cashEntry.amount) !== Number(walkinSale.totalAmount)) {
    throw new Error('Expected immediate debit entry to CASH account!');
  }
  console.log(`Verified immediate walk-in cash debit. Amount: ${cashEntry.amount}`);

  // 9. Create Walk-in Cash Purchase (no partyId)
  console.log('\n--- Creating Walk-in Cash Purchase ---');
  const walkinPurchaseInvoice = `PUR-CASH-${Date.now().toString().slice(-4)}`;
  const resultWalkinPurchase = await createOfflinePurchase({
    wholesalerId,
    invoiceNumber: walkinPurchaseInvoice,
    partyId: null,
    paymentMethod: 'BANK_TRANSFER',
    notes: 'Walk-in bank purchase test',
    items: [
      {
        productId: product.id,
        quantity: '1',
        unitPrice: '100.00',
      },
    ],
  });

  const walkinPurchase = resultWalkinPurchase.purchase;
  console.log(
    `Walk-in purchase created: ${walkinPurchase.id}. Invoice: ${walkinPurchase.invoiceNumber}`
  );
  console.log(
    `Walk-in purchase details -> totalAmount: ${walkinPurchase.totalAmount}, amountPaid: ${walkinPurchase.amountPaid}, balanceDue: ${walkinPurchase.balanceDue}`
  );

  if (
    Number(walkinPurchase.amountPaid) !== Number(walkinPurchase.totalAmount) ||
    Number(walkinPurchase.balanceDue) !== 0
  ) {
    throw new Error(
      'Expected walk-in purchase to be 100% bank paid (amountPaid: totalAmount, balanceDue: 0)!'
    );
  }

  const bankEntry = await prisma.accountingEntry.findFirst({
    where: {
      wholesalerId,
      offlinePurchaseId: walkinPurchase.id,
      account: { code: 'BANK' },
    },
  });
  if (!bankEntry || Number(bankEntry.amount) !== -Number(walkinPurchase.totalAmount)) {
    throw new Error('Expected immediate credit entry (negative) to BANK account!');
  }
  console.log(`Verified immediate walk-in bank credit. Amount: ${bankEntry.amount}`);

  console.log('\n--- All Ledger & Reconciliation Tests Passed Successfully! ---');
}

runTests()
  .catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
