const DAY_MS = 24 * 60 * 60 * 1000;

const TIMEFRAMES = new Set(['daily', 'monthly', 'yearly']);

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));
const roundRatio = (value) => Number(Number(value || 0).toFixed(4));
const asDate = (value) => (value instanceof Date ? value : new Date(value));
const toNumber = (value) => Number(value || 0);

const getPeriodKey = (date, timeframe) => {
  const current = asDate(date);
  const year = current.getUTCFullYear();
  const month = `${current.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${current.getUTCDate()}`.padStart(2, '0');

  if (timeframe === 'daily') return `${year}-${month}-${day}`;
  if (timeframe === 'yearly') return `${year}`;
  return `${year}-${month}`;
};

const comparePeriodKeys = (left, right, timeframe) => {
  if (timeframe === 'yearly') return Number(left) - Number(right);
  return left.localeCompare(right);
};

const getNetSoldQuantity = (item) => {
  if (!item || item.status === 'CANCELLED') return 0;
  const quantity = Math.max(0, toNumber(item.quantity));
  const returnedQuantity = Math.max(0, toNumber(item.returnedQuantity));
  return Math.max(0, quantity - returnedQuantity);
};

const getUnitSellingPrice = (item) => toNumber(item.unitPriceAtPurchase ?? item.price);
const getUnitCostPrice = (item) => toNumber(item.product?.costPrice);

export const getRevenueForItem = (item) =>
  roundCurrency(getUnitSellingPrice(item) * getNetSoldQuantity(item));
export const getProfitForItem = (item) =>
  roundCurrency((getUnitSellingPrice(item) - getUnitCostPrice(item)) * getNetSoldQuantity(item));

const normalizeBuyerName = (buyer) => buyer?.name?.trim() || buyer?.email?.trim() || 'Customer';

export const buildAnalyticsOverview = ({
  products = [],
  orders = [],
  timeframe = 'monthly',
  now = new Date(),
}) => {
  const normalizedTimeframe = TIMEFRAMES.has(timeframe) ? timeframe : 'monthly';
  const currentDate = asDate(now);
  const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * DAY_MS);

  const trendMap = new Map();
  const skuMap = new Map();
  const customerMap = new Map();
  const productLastNetSaleMap = new Map();

  let totalRevenue = 0;
  let totalProfit = 0;
  let countedOrders = 0;

  for (const order of orders) {
    const orderDate = asDate(order.createdAt);
    let orderRevenue = 0;
    let orderProfit = 0;
    let orderUnits = 0;

    for (const item of order.items || []) {
      const netSoldQuantity = getNetSoldQuantity(item);
      if (netSoldQuantity <= 0) continue;

      const unitPrice = getUnitSellingPrice(item);
      const unitCost = getUnitCostPrice(item);
      const revenue = roundCurrency(unitPrice * netSoldQuantity);
      const profit = roundCurrency((unitPrice - unitCost) * netSoldQuantity);

      orderRevenue += revenue;
      orderProfit += profit;
      orderUnits += netSoldQuantity;

      const skuEntry = skuMap.get(item.productId) || {
        productId: item.productId,
        sku: item.product?.sku || 'N/A',
        name: item.product?.name || 'Deleted product',
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        currentStock: toNumber(item.product?.currentStock),
      };

      skuEntry.unitsSold += netSoldQuantity;
      skuEntry.revenue = roundCurrency(skuEntry.revenue + revenue);
      skuEntry.profit = roundCurrency(skuEntry.profit + profit);
      skuMap.set(item.productId, skuEntry);

      const previousLastSale = productLastNetSaleMap.get(item.productId);
      if (!previousLastSale || orderDate > previousLastSale) {
        productLastNetSaleMap.set(item.productId, orderDate);
      }
    }

    if (orderRevenue <= 0 || orderUnits <= 0) {
      continue;
    }

    countedOrders += 1;
    totalRevenue = roundCurrency(totalRevenue + orderRevenue);
    totalProfit = roundCurrency(totalProfit + orderProfit);

    const period = getPeriodKey(orderDate, normalizedTimeframe);
    const trendEntry = trendMap.get(period) || {
      period,
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    trendEntry.revenue = roundCurrency(trendEntry.revenue + orderRevenue);
    trendEntry.profit = roundCurrency(trendEntry.profit + orderProfit);
    trendEntry.orders += 1;
    trendMap.set(period, trendEntry);

    const customerId = order.buyerId || 'anonymous';
    const customerEntry = customerMap.get(customerId) || {
      customerId,
      customerName: normalizeBuyerName(order.buyer),
      customerEmail: order.buyer?.email?.trim() || null,
      lifetimeRevenue: 0,
      orderCount: 0,
      lastOrderAt: null,
    };
    customerEntry.lifetimeRevenue = roundCurrency(customerEntry.lifetimeRevenue + orderRevenue);
    customerEntry.orderCount += 1;
    if (!customerEntry.lastOrderAt || orderDate > customerEntry.lastOrderAt) {
      customerEntry.lastOrderAt = orderDate;
    }
    customerMap.set(customerId, customerEntry);
  }

  const topSkus = Array.from(skuMap.values())
    .map((entry) => ({
      ...entry,
      profitMargin: entry.revenue > 0 ? roundRatio(entry.profit / entry.revenue) : 0,
    }))
    .sort(
      (left, right) =>
        right.unitsSold - left.unitsSold ||
        right.revenue - left.revenue ||
        right.profit - left.profit
    )
    .slice(0, 10);

  const slowMovingInventory = products
    .filter((product) => toNumber(product.currentStock) > 0)
    .filter((product) => {
      const lastSale = productLastNetSaleMap.get(product.id);
      return !lastSale || lastSale < thirtyDaysAgo;
    })
    .map((product) => {
      const lastSale = productLastNetSaleMap.get(product.id) || null;
      const daysSinceLastSale = lastSale
        ? Math.max(0, Math.floor((currentDate.getTime() - lastSale.getTime()) / DAY_MS))
        : null;

      return {
        productId: product.id,
        sku: product.sku || 'N/A',
        name: product.name,
        currentStock: toNumber(product.currentStock),
        inventoryValue: roundCurrency(toNumber(product.costPrice) * toNumber(product.currentStock)),
        daysSinceLastSale,
        lastSoldAt: lastSale ? lastSale.toISOString() : null,
      };
    })
    .sort(
      (left, right) =>
        right.inventoryValue - left.inventoryValue ||
        (right.daysSinceLastSale || 0) - (left.daysSinceLastSale || 0)
    );

  const customerEntries = Array.from(customerMap.values()).map((customer) => {
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.max(0, Math.floor((currentDate.getTime() - customer.lastOrderAt.getTime()) / DAY_MS))
      : null;

    let riskLevel = null;
    if (customer.orderCount >= 2 && daysSinceLastOrder > 90) {
      riskLevel = 'high';
    } else if (
      (customer.orderCount >= 2 && daysSinceLastOrder >= 45 && daysSinceLastOrder <= 90) ||
      (customer.orderCount === 1 && daysSinceLastOrder > 30)
    ) {
      riskLevel = 'medium';
    }

    return {
      ...customer,
      lastOrderAt: customer.lastOrderAt ? customer.lastOrderAt.toISOString() : null,
      daysSinceLastOrder,
      riskLevel,
    };
  });

  const repeatCustomers = customerEntries.filter((customer) => customer.orderCount > 1).length;
  const totalCustomers = customerEntries.length;
  const repeatCustomerRate = totalCustomers > 0 ? roundRatio(repeatCustomers / totalCustomers) : 0;
  const estimatedClv = totalCustomers > 0 ? roundCurrency(totalRevenue / totalCustomers) : 0;
  const averageRevenuePerCustomer =
    totalCustomers > 0 ? roundCurrency(totalRevenue / totalCustomers) : 0;

  const churnRiskCustomers = customerEntries
    .filter((customer) => customer.riskLevel)
    .sort(
      (left, right) =>
        (right.daysSinceLastOrder || 0) - (left.daysSinceLastOrder || 0) ||
        right.lifetimeRevenue - left.lifetimeRevenue
    )
    .map((customer) => ({
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      lifetimeRevenue: customer.lifetimeRevenue,
      orderCount: customer.orderCount,
      lastOrderAt: customer.lastOrderAt,
      daysSinceLastOrder: customer.daysSinceLastOrder,
      riskLevel: customer.riskLevel,
    }));

  const salesTrend = Array.from(trendMap.values())
    .sort((left, right) => comparePeriodKeys(left.period, right.period, normalizedTimeframe))
    .map((entry) => ({
      period: entry.period,
      revenue: roundCurrency(entry.revenue),
      profit: roundCurrency(entry.profit),
      profitMargin: entry.revenue > 0 ? roundRatio(entry.profit / entry.revenue) : 0,
      orders: entry.orders,
    }));

  const inventoryValue = roundCurrency(
    products.reduce(
      (sum, product) => sum + toNumber(product.costPrice) * toNumber(product.currentStock),
      0
    )
  );

  const skuCount = products.filter((product) => toNumber(product.currentStock) > 0).length;
  const slowMovingSkuCount = slowMovingInventory.length;
  const avgOrderValue = countedOrders > 0 ? roundCurrency(totalRevenue / countedOrders) : 0;
  const atRiskCustomerCount = churnRiskCustomers.length;
  const highRiskCount = churnRiskCustomers.filter(
    (customer) => customer.riskLevel === 'high'
  ).length;
  const mediumRiskCount = churnRiskCustomers.filter(
    (customer) => customer.riskLevel === 'medium'
  ).length;

  return {
    headline: {
      revenue: roundCurrency(totalRevenue),
      profit: roundCurrency(totalProfit),
      profitMargin: totalRevenue > 0 ? roundRatio(totalProfit / totalRevenue) : 0,
      inventoryValue,
      skuCount,
      slowMovingSkuCount,
      avgOrderValue,
      estimatedClv,
      atRiskCustomerCount,
      repeatCustomerRate,
    },
    salesTrend,
    topSkus,
    slowMovingInventory,
    customerInsights: {
      totalCustomers,
      repeatCustomers,
      repeatCustomerRate,
      averageRevenuePerCustomer,
      estimatedClv,
    },
    churnRisk: {
      highRiskCount,
      mediumRiskCount,
      customers: churnRiskCustomers,
    },
  };
};
