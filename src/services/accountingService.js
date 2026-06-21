import { prisma } from '../config/db.js';

const CORE_ACCOUNTS = [
  { code: 'CASH', name: 'Cash in Hand', category: 'ASSET' },
  { code: 'BANK', name: 'Bank Account', category: 'ASSET' },
  { code: 'UPI', name: 'UPI Wallet', category: 'ASSET' },
  { code: 'CARD', name: 'Card Settlements', category: 'ASSET' },
  { code: 'RECEIVABLE', name: 'Accounts Receivable', category: 'ASSET' },
  { code: 'PAYABLE', name: 'Accounts Payable', category: 'LIABILITY' },
  { code: 'SALES', name: 'Offline Sales', category: 'INCOME' },
  { code: 'UNRECONCILED_DEPOSITS', name: 'Unreconciled Deposits', category: 'ASSET' },
  { code: 'UNRECONCILED_OUTFLOWS', name: 'Unreconciled Outflows', category: 'LIABILITY' },
  { code: 'PURCHASES', name: 'Offline Purchases', category: 'EXPENSE' },
];

const PAYMENT_METHOD_TO_ACCOUNT = {
  CASH: 'CASH',
  CREDIT: 'RECEIVABLE',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK',
  CARD: 'CARD',
  CHEQUE: 'UNRECONCILED_DEPOSITS',
  OTHER: 'CASH',
};

const MONEY_PRECISION = 100;

function roundMoney(value) {
  return Math.round(Number(value) * MONEY_PRECISION) / MONEY_PRECISION;
}

function parseMoney(value, fieldName) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid amount.`);
  }

  return roundMoney(parsed);
}

function normalizeInvoiceNumber(rawValue) {
  return rawValue ? String(rawValue).trim().toUpperCase() : null;
}

async function ensureCoreAccounts(tx, wholesalerId) {
  const existingAccounts = await tx.accountingAccount.findMany({
    where: {
      wholesalerId,
      code: { in: CORE_ACCOUNTS.map((account) => account.code) },
    },
  });

  const existingCodes = new Set(existingAccounts.map((account) => account.code));
  const missingAccounts = CORE_ACCOUNTS.filter((account) => !existingCodes.has(account.code));

  if (missingAccounts.length > 0) {
    await tx.accountingAccount.createMany({
      data: missingAccounts.map((account) => ({
        wholesalerId,
        ...account,
        isSystem: true,
      })),
    });
  }

  const allAccounts = await tx.accountingAccount.findMany({
    where: {
      wholesalerId,
      code: { in: CORE_ACCOUNTS.map((account) => account.code) },
    },
  });

  return Object.fromEntries(allAccounts.map((account) => [account.code, account]));
}

function getPaymentAccountCode(paymentMethod) {
  return PAYMENT_METHOD_TO_ACCOUNT[paymentMethod] || 'CASH';
}

async function createOpeningBalanceArtifacts(tx, wholesalerId, party) {
  const openingBalance = Number(party.openingBalance);
  if (!openingBalance) {
    return;
  }

  const accounts = await ensureCoreAccounts(tx, wholesalerId);
  const accountCode = party.openingBalanceKind === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE';
  const account = accounts[accountCode];

  await tx.accountingEntry.create({
    data: {
      wholesalerId,
      accountId: account.id,
      partyId: party.id,
      amount: openingBalance,
      description: 'Opening balance',
      referenceId: `OPEN-${party.id}`,
    },
  });

  if (party.linkedUserId && party.openingBalanceKind === 'RECEIVABLE') {
    await tx.ledgerEntry.create({
      data: {
        wholesalerId,
        userId: party.linkedUserId,
        amount: -openingBalance,
        description: `Opening balance for ${party.name}`,
        source: 'PARTY_OPENING_BALANCE',
        referenceId: party.id,
        idempotencyKey: `party-opening-${party.id}`,
      },
    });
  }
}

export async function createBusinessParty({
  wholesalerId,
  linkedUserId,
  name,
  phone,
  email,
  taxId,
  address,
  type,
  openingBalance,
  openingBalanceKind,
  notes,
}) {
  return prisma.$transaction(async (tx) => {
    if (!name?.trim()) {
      throw new Error('Party name is required.');
    }

    if (linkedUserId) {
      const linkedUser = await tx.user.findUnique({
        where: { id: linkedUserId },
        select: { id: true },
      });

      if (!linkedUser) {
        throw new Error('Linked marketplace user was not found.');
      }
    }

    const party = await tx.businessParty.create({
      data: {
        wholesalerId,
        linkedUserId: linkedUserId || null,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        taxId: taxId?.trim() || null,
        address: address?.trim() || null,
        type: type || 'CUSTOMER',
        openingBalance: openingBalance ? parseMoney(openingBalance, 'Opening balance') : 0,
        openingBalanceKind: openingBalanceKind || 'RECEIVABLE',
        notes: notes?.trim() || null,
      },
      include: {
        linkedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createOpeningBalanceArtifacts(tx, wholesalerId, party);

    return party;
  });
}

export async function recordPartyTransaction({
  wholesalerId,
  partyId,
  amount,
  direction,
  paymentMethod,
  description,
  referenceId,
  instrumentNumber,
  bankName,
  drawerName,
  dueDate,
  awaitingClearance,
}) {
  return prisma.$transaction(async (tx) => {
    const value = parseMoney(amount, 'Amount');
    if (value <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    if (!['IN', 'OUT'].includes(direction)) {
      throw new Error('Direction must be either IN or OUT.');
    }

    const party = await tx.businessParty.findFirst({
      where: { id: partyId, wholesalerId },
      include: {
        linkedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!party) {
      throw new Error('Party not found.');
    }

    const accounts = await ensureCoreAccounts(tx, wholesalerId);

    // Determine payment account:
    const isAwaiting = awaitingClearance || paymentMethod === 'CHEQUE';
    const cleanDescription =
      description?.trim() ||
      (direction === 'IN' ? 'Manual payment received' : 'Manual payment made');

    let ledgerEntry = null;

    if (!isAwaiting) {
      const paymentAccount = accounts[getPaymentAccountCode(paymentMethod)];
      const counterAccount = direction === 'IN' ? accounts.RECEIVABLE : accounts.PAYABLE;

      const entries = [
        {
          wholesalerId,
          accountId: paymentAccount.id,
          partyId: party.id,
          amount: direction === 'IN' ? value : -value,
          description: cleanDescription,
          referenceId: referenceId?.trim() || null,
        },
        {
          wholesalerId,
          accountId: counterAccount.id,
          partyId: party.id,
          amount: -value,
          description: cleanDescription,
          referenceId: referenceId?.trim() || null,
        },
      ];

      await tx.accountingEntry.createMany({ data: entries });

      if (direction === 'IN' && party.linkedUserId) {
        ledgerEntry = await tx.ledgerEntry.create({
          data: {
            wholesalerId,
            userId: party.linkedUserId,
            amount: value,
            description: cleanDescription,
            referenceId: referenceId?.trim() || party.id,
            source: 'OFFLINE_SALE_PAYMENT',
            idempotencyKey: `party-payment-${party.id}-${Date.now()}`,
          },
        });
      }
    }

    // Track instrument if details are provided or it's a cheque/unreconciled
    if (isAwaiting || instrumentNumber || bankName || drawerName) {
      await tx.paymentInstrument.create({
        data: {
          wholesalerId,
          partyId: party.id,
          paymentMethod,
          instrumentNumber: instrumentNumber || null,
          bankName: bankName || null,
          drawerName: drawerName || null,
          amount: value,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: isAwaiting ? 'PENDING' : 'CLEARED',
          type: direction === 'IN' ? 'RECEIVABLE' : 'PAYABLE',
        },
      });
    }

    return { party, ledgerEntry };
  });
}

export async function createOfflineSale({
  wholesalerId,
  invoiceNumber,
  partyId,
  paymentMethod,
  notes,
  items,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one sale item is required.');
  }

  return prisma.$transaction(async (tx) => {
    const normalizedItems = items.map((item, index) => ({
      productId: item.productId,
      quantity: Number.parseInt(item.quantity, 10),
      unitPrice: parseMoney(item.unitPrice, `Unit price for item ${index + 1}`),
    }));

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.unitPrice < 0
    );
    if (invalidItem) {
      throw new Error(
        'Each sale item must include a product, positive quantity, and valid unit price.'
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    if (productIds.length !== normalizedItems.length) {
      throw new Error('A product can only appear once per offline sale.');
    }

    const accounts = await ensureCoreAccounts(tx, wholesalerId);
    const products = await tx.product.findMany({
      where: {
        wholesalerId,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
      },
    });
    const party = partyId
      ? await tx.businessParty.findFirst({
          where: { id: partyId, wholesalerId },
          include: {
            linkedUser: {
              select: { id: true, name: true, email: true },
            },
          },
        })
      : null;

    if (partyId && !party) {
      throw new Error('Selected party was not found.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const missingProduct = normalizedItems.find((item) => !productMap.has(item.productId));
    if (missingProduct) {
      throw new Error('One or more sale products were not found for this wholesaler.');
    }

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (product.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }
    }

    const totalAmount = roundMoney(
      normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    );

    const paidAmount = party ? 0 : totalAmount;
    const dueAmount = party ? totalAmount : 0;
    const finalPaymentMethod = party ? 'CREDIT' : paymentMethod || 'CASH';

    const invoice =
      normalizeInvoiceNumber(invoiceNumber) ||
      `OFF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    const sale = await tx.offlineSale.create({
      data: {
        wholesalerId,
        partyId: party?.id || null,
        invoiceNumber: invoice,
        paymentMethod: finalPaymentMethod,
        totalAmount,
        amountReceived: paidAmount,
        balanceDue: dueAmount,
        notes: notes?.trim() || null,
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: roundMoney(item.quantity * item.unitPrice),
          })),
        },
      },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            linkedUserId: true,
            linkedUser: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    for (const item of normalizedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { decrement: item.quantity },
        },
      });
    }

    await tx.inventoryLog.createMany({
      data: normalizedItems.map((item) => ({
        wholesalerId,
        productId: item.productId,
        changeAmount: -item.quantity,
        reason: 'SALE',
      })),
    });

    const accountingEntries = [
      {
        wholesalerId,
        accountId: accounts.SALES.id,
        partyId: party?.id || null,
        offlineSaleId: sale.id,
        amount: totalAmount,
        description: `Offline sale ${invoice}`,
        referenceId: sale.id,
      },
    ];

    if (paidAmount > 0) {
      const targetAccount = accounts[getPaymentAccountCode(finalPaymentMethod)] || accounts.CASH;
      accountingEntries.push({
        wholesalerId,
        accountId: targetAccount.id,
        partyId: null,
        offlineSaleId: sale.id,
        amount: paidAmount,
        description: `Payment received for walk-in sale ${invoice}`,
        referenceId: sale.id,
      });
    }

    if (dueAmount > 0) {
      accountingEntries.push({
        wholesalerId,
        accountId: accounts.RECEIVABLE.id,
        partyId: party.id,
        offlineSaleId: sale.id,
        amount: dueAmount,
        description: `Credit due for offline sale ${invoice}`,
        referenceId: sale.id,
      });
    }

    await tx.accountingEntry.createMany({ data: accountingEntries });

    let ledgerEntry = null;
    if (dueAmount > 0 && party?.linkedUserId) {
      ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wholesalerId,
          userId: party.linkedUserId,
          orderId: null,
          amount: -dueAmount,
          description: `Offline credit sale ${invoice}`,
          referenceId: sale.id,
          source: 'OFFLINE_SALE_CREDIT',
          idempotencyKey: `offline-sale-credit-${sale.id}`,
        },
      });
    }

    return { sale, ledgerEntry };
  });
}

export async function getAccountingHub(wholesalerId) {
  await prisma.$transaction(async (tx) => {
    await ensureCoreAccounts(tx, wholesalerId);
  });

  const [
    parties,
    accounts,
    entriesByAccount,
    entriesByParty,
    sales,
    ledgerEntries,
    ecomOrders,
    offlinePurchases,
    paymentInstruments,
  ] = await Promise.all([
    prisma.businessParty.findMany({
      where: { wholesalerId },
      include: {
        linkedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    }),
    prisma.accountingAccount.findMany({
      where: { wholesalerId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.accountingEntry.groupBy({
      by: ['accountId'],
      where: { wholesalerId },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.groupBy({
      by: ['partyId', 'accountId'],
      where: {
        wholesalerId,
        partyId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.offlineSale.findMany({
      where: { wholesalerId },
      include: {
        party: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { soldAt: 'desc' },
      take: 50,
    }),
    prisma.ledgerEntry.findMany({
      where: { wholesalerId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    // E-commerce orders
    prisma.order.findMany({
      where: { sellerId: wholesalerId },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Offline purchases
    prisma.offlinePurchase.findMany({
      where: { wholesalerId },
      include: {
        party: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 50,
    }),
    // Payment Instruments (Cheques, UPI slips, etc.)
    prisma.paymentInstrument.findMany({
      where: { wholesalerId },
      include: {
        party: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const accountCodeMap = new Map(accounts.map((account) => [account.id, account.code]));
  const accountSummaries = accounts.map((account) => {
    const movement =
      entriesByAccount.find((entry) => entry.accountId === account.id)?._sum.amount || 0;
    const balance = roundMoney(Number(account.openingBalance) + Number(movement || 0));

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      category: account.category,
      isSystem: account.isSystem,
      openingBalance: Number(account.openingBalance),
      balance,
    };
  });

  const partySummaries = parties.map((party) => {
    const partyEntries = entriesByParty.filter((entry) => entry.partyId === party.id);
    let receivable = 0;
    let payable = 0;

    for (const entry of partyEntries) {
      const code = accountCodeMap.get(entry.accountId);
      const amount = Number(entry._sum.amount || 0);
      if (code === 'RECEIVABLE') {
        receivable += amount;
      }
      if (code === 'PAYABLE') {
        payable += amount;
      }
    }

    const netBalance = roundMoney(receivable - payable);

    return {
      id: party.id,
      name: party.name,
      type: party.type,
      phone: party.phone,
      email: party.email,
      taxId: party.taxId,
      address: party.address,
      linkedUser: party.linkedUser,
      netBalance,
      receivable: roundMoney(Math.max(netBalance, 0)),
      payable: roundMoney(Math.max(-netBalance, 0)),
      relationship: netBalance > 0 ? 'THEY_OWE_YOU' : netBalance < 0 ? 'YOU_OWE_THEM' : 'SETTLED',
      notes: party.notes,
    };
  });

  const categoryTotals = accountSummaries.reduce(
    (acc, account) => {
      acc[account.category] = roundMoney((acc[account.category] || 0) + account.balance);
      return acc;
    },
    { ASSET: 0, LIABILITY: 0, INCOME: 0, EXPENSE: 0, EQUITY: 0 }
  );

  // Build combined sales register
  const combinedSales = [
    ...sales.map((s) => ({
      id: s.id,
      date: s.soldAt,
      type: 'OFFLINE',
      invoiceNumber: s.invoiceNumber,
      partyName: s.party?.name || 'Walk-in customer',
      paymentMethod: s.paymentMethod,
      totalAmount: Number(s.totalAmount),
      amountReceived: Number(s.amountReceived),
      balanceDue: Number(s.balanceDue),
      status: 'COMPLETED',
      isPendingBankTransfer: false,
    })),
    ...ecomOrders.map((o) => ({
      id: o.id,
      date: o.createdAt,
      type: 'ECOMMERCE',
      invoiceNumber: `MKT-${o.id.slice(0, 8).toUpperCase()}`,
      partyName: o.buyer?.name || 'Marketplace buyer',
      paymentMethod: o.paymentMethod,
      totalAmount: Number(o.totalAmount),
      amountReceived: o.paymentStatus === 'PAID' ? Number(o.totalAmount) : 0,
      balanceDue: o.paymentStatus === 'PAID' ? 0 : Number(o.totalAmount),
      status: o.status,
      isPendingBankTransfer: o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'PENDING',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const salesOverview = combinedSales.reduce(
    (acc, sale) => {
      acc.totalSales = roundMoney(acc.totalSales + Number(sale.totalAmount));
      acc.totalReceived = roundMoney(acc.totalReceived + Number(sale.amountReceived));
      acc.totalOutstanding = roundMoney(acc.totalOutstanding + Number(sale.balanceDue));
      return acc;
    },
    { totalSales: 0, totalReceived: 0, totalOutstanding: 0 }
  );

  return {
    overview: {
      ...categoryTotals,
      partiesReceivable: roundMoney(
        partySummaries.reduce((sum, party) => sum + party.receivable, 0)
      ),
      partiesPayable: roundMoney(partySummaries.reduce((sum, party) => sum + party.payable, 0)),
      ...salesOverview,
    },
    parties: partySummaries,
    accounts: accountSummaries,
    sales: combinedSales,
    offlinePurchases,
    paymentInstruments,
    ledgerEntries,
  };
}

export async function getOrCreateMarketplaceBusinessParty(tx, wholesalerId, buyerId) {
  // 1. Search by linkedUserId
  let party = await tx.businessParty.findFirst({
    where: { wholesalerId, linkedUserId: buyerId },
  });
  if (party) return party;

  // 2. Fetch buyer details
  const buyer = await tx.user.findUnique({
    where: { id: buyerId },
  });
  if (!buyer) {
    throw new Error(`Buyer not found: ${buyerId}`);
  }

  const baseName = buyer.name.trim();

  // 3. Search by name to prevent @@unique([wholesalerId, name]) collision
  party = await tx.businessParty.findUnique({
    where: { wholesalerId_name: { wholesalerId, name: baseName } },
  });

  if (party) {
    // If it's already linked to a user, it must be another user. So generate unique name.
    if (party.linkedUserId && party.linkedUserId !== buyerId) {
      const uniqueName = `${baseName} (${buyerId.slice(0, 4)})`;
      return tx.businessParty.create({
        data: {
          wholesalerId,
          linkedUserId: buyerId,
          name: uniqueName,
          email: buyer.email,
          type: 'CUSTOMER',
        },
      });
    } else {
      // If it's not linked, link it now
      return tx.businessParty.update({
        where: { id: party.id },
        data: { linkedUserId: buyerId, email: buyer.email || party.email },
      });
    }
  }

  // 4. Create new BusinessParty
  return tx.businessParty.create({
    data: {
      wholesalerId,
      linkedUserId: buyerId,
      name: baseName,
      email: buyer.email,
      type: 'CUSTOMER',
    },
  });
}

export async function recordMarketplaceOrderCharge(
  tx,
  { orderId, sellerId, totalAmount, paymentStatus }
) {
  const accounts = await ensureCoreAccounts(tx, sellerId);

  const isPaid = paymentStatus === 'PAID';
  const targetAccount = isPaid ? accounts.BANK || accounts.CASH : accounts.UNRECONCILED_DEPOSITS;

  // Debit targetAccount, Credit SALES
  await tx.accountingEntry.createMany({
    data: [
      {
        wholesalerId: sellerId,
        accountId: accounts.SALES.id,
        partyId: null,
        amount: totalAmount,
        description: `Marketplace Order ${orderId}`,
        referenceId: orderId,
      },
      {
        wholesalerId: sellerId,
        accountId: targetAccount.id,
        partyId: null,
        amount: totalAmount,
        description: isPaid
          ? `Marketplace Paid Order ${orderId}`
          : `Marketplace Pending Order ${orderId} (Awaiting Clearance)`,
        referenceId: orderId,
      },
    ],
  });
}

export async function recordMarketplaceOrderPayment(
  tx,
  { orderId, sellerId, settlementAmount, paymentMethod }
) {
  let actualMethod = paymentMethod;
  if (orderId) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paymentReferenceNo: true, paymentMethod: true },
    });
    if (order) {
      if (order.paymentReferenceNo?.startsWith('UPI:')) {
        actualMethod = 'UPI';
      } else {
        actualMethod = order.paymentMethod;
      }
    }
  }

  const accounts = await ensureCoreAccounts(tx, sellerId);
  const accountCode = actualMethod === 'COD' ? 'CASH' : actualMethod === 'UPI' ? 'UPI' : 'BANK';
  const payAccount = accounts[accountCode] || accounts.CASH;

  // Move from UNRECONCILED_DEPOSITS to BANK/CASH/UPI
  await tx.accountingEntry.createMany({
    data: [
      {
        wholesalerId: sellerId,
        accountId: payAccount.id,
        partyId: null,
        amount: settlementAmount,
        description: `Marketplace Payment Verified ${orderId}`,
        referenceId: orderId,
      },
      {
        wholesalerId: sellerId,
        accountId: accounts.UNRECONCILED_DEPOSITS.id,
        partyId: null,
        amount: -settlementAmount,
        description: `Clearance of pending deposit for Order ${orderId}`,
        referenceId: orderId,
      },
    ],
  });
}

export async function recordMarketplaceOrderReturnCharge(
  tx,
  { orderId, sellerId, returnAmount, description }
) {
  const accounts = await ensureCoreAccounts(tx, sellerId);

  // Reversal of sales: Debit SALES (-), Credit UNRECONCILED_DEPOSITS (-)
  await tx.accountingEntry.createMany({
    data: [
      {
        wholesalerId: sellerId,
        accountId: accounts.SALES.id,
        partyId: null,
        amount: -returnAmount,
        description: description || `Return charge reversal for Order ${orderId}`,
        referenceId: orderId,
      },
      {
        wholesalerId: sellerId,
        accountId: accounts.UNRECONCILED_DEPOSITS.id,
        partyId: null,
        amount: -returnAmount,
        description: description || `Return receivable reversal for Order ${orderId}`,
        referenceId: orderId,
      },
    ],
  });
}

export async function recordMarketplaceOrderReturnPayment(
  tx,
  { orderId, sellerId, returnAmount, paymentMethod, description }
) {
  let actualMethod = paymentMethod;
  if (orderId) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paymentReferenceNo: true, paymentMethod: true },
    });
    if (order) {
      if (order.paymentReferenceNo?.startsWith('UPI:')) {
        actualMethod = 'UPI';
      } else {
        actualMethod = order.paymentMethod;
      }
    }
  }

  const accounts = await ensureCoreAccounts(tx, sellerId);
  const accountCode = actualMethod === 'COD' ? 'CASH' : actualMethod === 'UPI' ? 'UPI' : 'BANK';
  const payAccount = accounts[accountCode] || accounts.CASH;

  // Move from UNRECONCILED_DEPOSITS to BANK/CASH/UPI
  await tx.accountingEntry.createMany({
    data: [
      {
        wholesalerId: sellerId,
        accountId: accounts.UNRECONCILED_DEPOSITS.id,
        partyId: null,
        amount: returnAmount,
        description: description || `Return payment adjustment for Order ${orderId}`,
        referenceId: orderId,
      },
      {
        wholesalerId: sellerId,
        accountId: payAccount.id,
        partyId: null,
        amount: -returnAmount,
        description: description || `Return payment payout for Order ${orderId}`,
        referenceId: orderId,
      },
    ],
  });
}

export async function createOfflinePurchase({
  wholesalerId,
  invoiceNumber,
  partyId,
  paymentMethod,
  notes,
  items,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  return prisma.$transaction(async (tx) => {
    const normalizedItems = items.map((item, index) => ({
      productId: item.productId,
      quantity: Number.parseInt(item.quantity, 10),
      unitPrice: parseMoney(item.unitPrice, `Unit price for item ${index + 1}`),
    }));

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.unitPrice < 0
    );
    if (invalidItem) {
      throw new Error(
        'Each purchase item must include a product, positive quantity, and valid unit price.'
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    if (productIds.length !== normalizedItems.length) {
      throw new Error('A product can only appear once per offline purchase.');
    }

    const accounts = await ensureCoreAccounts(tx, wholesalerId);
    const products = await tx.product.findMany({
      where: {
        wholesalerId,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
      },
    });

    const party = partyId
      ? await tx.businessParty.findFirst({
          where: { id: partyId, wholesalerId },
          include: {
            linkedUser: {
              select: { id: true, name: true, email: true },
            },
          },
        })
      : null;

    if (partyId && !party) {
      throw new Error('Selected supplier was not found.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const missingProduct = normalizedItems.find((item) => !productMap.has(item.productId));
    if (missingProduct) {
      throw new Error('One or more purchase products were not found for this wholesaler.');
    }

    const totalAmount = roundMoney(
      normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    );

    const paidAmount = party ? 0 : totalAmount;
    const dueAmount = party ? totalAmount : 0;
    const finalPaymentMethod = party ? 'CREDIT' : paymentMethod || 'CASH';

    const invoice =
      normalizeInvoiceNumber(invoiceNumber) ||
      `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    // Create the purchase record
    const purchase = await tx.offlinePurchase.create({
      data: {
        wholesalerId,
        partyId: party?.id || null,
        invoiceNumber: invoice,
        paymentMethod: finalPaymentMethod,
        totalAmount,
        amountPaid: paidAmount,
        balanceDue: dueAmount,
        notes: notes?.trim() || null,
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: roundMoney(item.quantity * item.unitPrice),
          })),
        },
      },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            linkedUserId: true,
            linkedUser: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Update product stock levels (increment)
    for (const item of normalizedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.quantity },
        },
      });
    }

    // Log the inventory stock changes
    await tx.inventoryLog.createMany({
      data: normalizedItems.map((item) => ({
        wholesalerId,
        productId: item.productId,
        changeAmount: item.quantity,
        reason: 'OCR_UPDATE',
      })),
    });

    const accountingEntries = [
      {
        wholesalerId,
        accountId: accounts.PURCHASES.id,
        partyId: party?.id || null,
        offlinePurchaseId: purchase.id,
        amount: totalAmount,
        description: `Offline purchase ${invoice}`,
        referenceId: purchase.id,
      },
    ];

    if (paidAmount > 0) {
      const targetAccount = accounts[getPaymentAccountCode(finalPaymentMethod)] || accounts.CASH;
      accountingEntries.push({
        wholesalerId,
        accountId: targetAccount.id,
        partyId: null,
        offlinePurchaseId: purchase.id,
        amount: -paidAmount,
        description: `Payment made for walk-in purchase ${invoice}`,
        referenceId: purchase.id,
      });
    }

    if (dueAmount > 0) {
      accountingEntries.push({
        wholesalerId,
        accountId: accounts.PAYABLE.id,
        partyId: party.id,
        offlinePurchaseId: purchase.id,
        amount: dueAmount,
        description: `Credit outstanding for offline purchase ${invoice}`,
        referenceId: purchase.id,
      });
    }

    await tx.accountingEntry.createMany({ data: accountingEntries });

    return { purchase };
  });
}

export async function reconcileInstrument({ wholesalerId, instrumentId }) {
  return prisma.$transaction(async (tx) => {
    const instrument = await tx.paymentInstrument.findFirst({
      where: { id: instrumentId, wholesalerId, status: 'PENDING' },
      include: {
        party: true,
      },
    });

    if (!instrument) {
      throw new Error('Pending instrument not found.');
    }

    const accounts = await ensureCoreAccounts(tx, wholesalerId);
    const targetAccountCode =
      instrument.paymentMethod === 'CHEQUE'
        ? 'BANK'
        : getPaymentAccountCode(instrument.paymentMethod);
    const bankAccount = accounts[targetAccountCode] || accounts.BANK;

    // Transition instrument to CLEARED
    await tx.paymentInstrument.update({
      where: { id: instrumentId },
      data: { status: 'CLEARED' },
    });

    // Create clearing entries
    const description = `Clearance of ${instrument.paymentMethod} #${instrument.instrumentNumber || ''}`;

    if (instrument.partyId) {
      // B2B party instrument - was NOT posted to ledger yet. Post to RECEIVABLE/PAYABLE and BANK/CASH now!
      if (instrument.type === 'RECEIVABLE') {
        // Debit BANK/CASH, Credit RECEIVABLE
        await tx.accountingEntry.createMany({
          data: [
            {
              wholesalerId,
              accountId: bankAccount.id,
              partyId: instrument.partyId,
              offlineSaleId: instrument.offlineSaleId,
              amount: Number(instrument.amount), // debit asset
              description,
              referenceId: instrument.id,
            },
            {
              wholesalerId,
              accountId: accounts.RECEIVABLE.id,
              partyId: instrument.partyId,
              offlineSaleId: instrument.offlineSaleId,
              amount: -Number(instrument.amount), // credit receivable (reduce debt)
              description,
              referenceId: instrument.id,
            },
          ],
        });

        // Create user ledger entry if party is linked to user
        if (instrument.party?.linkedUserId) {
          await tx.ledgerEntry.create({
            data: {
              wholesalerId,
              userId: instrument.party.linkedUserId,
              amount: Number(instrument.amount),
              description: `Cleared payment: ${instrument.paymentMethod} #${instrument.instrumentNumber || ''}`,
              referenceId: instrument.id,
              source: 'OFFLINE_SALE_PAYMENT',
              idempotencyKey: `clear-payment-${instrument.id}`,
            },
          });
        }
      } else {
        // Outward (PAYABLE) payment: Debit PAYABLE (reduce payable liability), Credit BANK/CASH
        await tx.accountingEntry.createMany({
          data: [
            {
              wholesalerId,
              accountId: accounts.PAYABLE.id,
              partyId: instrument.partyId,
              offlinePurchaseId: instrument.offlinePurchaseId,
              amount: Number(instrument.amount), // debit liability
              description,
              referenceId: instrument.id,
            },
            {
              wholesalerId,
              accountId: bankAccount.id,
              partyId: instrument.partyId,
              offlinePurchaseId: instrument.offlinePurchaseId,
              amount: -Number(instrument.amount), // credit asset
              description,
              referenceId: instrument.id,
            },
          ],
        });
      }
    } else {
      // E-commerce/System instrument - already posted to UNRECONCILED. Move from UNRECONCILED to BANK/CASH.
      if (instrument.type === 'RECEIVABLE') {
        await tx.accountingEntry.createMany({
          data: [
            {
              wholesalerId,
              accountId: accounts.UNRECONCILED_DEPOSITS.id,
              partyId: null,
              offlineSaleId: instrument.offlineSaleId,
              amount: -Number(instrument.amount),
              description,
              referenceId: instrument.id,
            },
            {
              wholesalerId,
              accountId: bankAccount.id,
              partyId: null,
              offlineSaleId: instrument.offlineSaleId,
              amount: Number(instrument.amount),
              description,
              referenceId: instrument.id,
            },
          ],
        });
      } else {
        await tx.accountingEntry.createMany({
          data: [
            {
              wholesalerId,
              accountId: accounts.UNRECONCILED_OUTFLOWS.id,
              partyId: null,
              offlinePurchaseId: instrument.offlinePurchaseId,
              amount: Number(instrument.amount),
              description,
              referenceId: instrument.id,
            },
            {
              wholesalerId,
              accountId: bankAccount.id,
              partyId: null,
              offlinePurchaseId: instrument.offlinePurchaseId,
              amount: -Number(instrument.amount),
              description,
              referenceId: instrument.id,
            },
          ],
        });
      }
    }

    return instrument;
  });
}

export async function getPartyDetails(wholesalerId, partyId) {
  const party = await prisma.businessParty.findFirst({
    where: { id: partyId, wholesalerId },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!party) {
    throw new Error('Party not found.');
  }

  const [sales, purchases, entries, paymentInstruments] = await Promise.all([
    prisma.offlineSale.findMany({
      where: { partyId, wholesalerId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { soldAt: 'desc' },
    }),
    prisma.offlinePurchase.findMany({
      where: { partyId, wholesalerId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    }),
    prisma.accountingEntry.findMany({
      where: {
        partyId,
        wholesalerId,
        offlineSaleId: null,
        offlinePurchaseId: null,
      },
      include: {
        account: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentInstrument.findMany({
      where: { partyId, wholesalerId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Recalculate party net balance consistency
  const entriesByParty = await prisma.accountingEntry.groupBy({
    by: ['partyId', 'accountId'],
    where: {
      wholesalerId,
      partyId,
    },
    _sum: { amount: true },
  });

  const accounts = await prisma.accountingAccount.findMany({
    where: { wholesalerId },
  });
  const accountCodeMap = new Map(accounts.map((account) => [account.id, account.code]));

  let receivable = 0;
  let payable = 0;
  for (const entry of entriesByParty) {
    const code = accountCodeMap.get(entry.accountId);
    const amount = Number(entry._sum.amount || 0);
    if (code === 'RECEIVABLE') {
      receivable += amount;
    }
    if (code === 'PAYABLE') {
      payable += amount;
    }
  }
  const netBalance = Math.round((receivable - payable) * 100) / 100;

  const partySummary = {
    id: party.id,
    name: party.name,
    type: party.type,
    phone: party.phone,
    email: party.email,
    taxId: party.taxId,
    address: party.address,
    linkedUser: party.linkedUser,
    netBalance,
    receivable: Math.round(Math.max(netBalance, 0) * 100) / 100,
    payable: Math.round(Math.max(-netBalance, 0) * 100) / 100,
    relationship: netBalance > 0 ? 'THEY_OWE_YOU' : netBalance < 0 ? 'YOU_OWE_THEM' : 'SETTLED',
    notes: party.notes,
  };

  // Format bills
  const formattedSales = sales.map((s) => ({
    id: s.id,
    type: 'SALE',
    invoiceNumber: s.invoiceNumber,
    date: s.soldAt,
    paymentMethod: s.paymentMethod,
    totalAmount: Number(s.totalAmount),
    amountPaidReceived: Number(s.amountReceived),
    balanceDue: Number(s.balanceDue),
    notes: s.notes,
    items: s.items.map((item) => ({
      id: item.id,
      productName: item.product?.name || 'Unknown Product',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
  }));

  const formattedPurchases = purchases.map((p) => ({
    id: p.id,
    type: 'PURCHASE',
    invoiceNumber: p.invoiceNumber,
    date: p.purchasedAt,
    paymentMethod: p.paymentMethod,
    totalAmount: Number(p.totalAmount),
    amountPaidReceived: Number(p.amountPaid),
    balanceDue: Number(p.balanceDue),
    notes: p.notes,
    items: p.items.map((item) => ({
      id: item.id,
      productName: item.product?.name || 'Unknown Product',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
  }));

  const bills = [...formattedSales, ...formattedPurchases].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Format payments (filtering out RECEIVABLE/PAYABLE account entries to show actual cash/bank payment flows)
  const filteredPayments = entries
    .filter((entry) => entry.account.code !== 'RECEIVABLE' && entry.account.code !== 'PAYABLE')
    .map((entry) => ({
      id: entry.id,
      date: entry.createdAt,
      amount: Number(entry.amount),
      description: entry.description,
      accountName: entry.account.name,
      accountCode: entry.account.code,
      referenceId: entry.referenceId,
    }));

  return {
    party: partySummary,
    bills,
    payments: filteredPayments,
    paymentInstruments,
  };
}
