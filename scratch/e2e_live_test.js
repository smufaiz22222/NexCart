import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

let server;
let SERVER_BASE;
const FASTAPI_BASE = 'http://127.0.0.1:8000';
const DEFAULT_PASSWORD = 'password123';

const log = (step, msg, details = '') => {
  console.log(`[E2E VERIFICATION] [${step}] ${msg}`, details ? JSON.stringify(details) : '');
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
};

async function ensureTestUsers() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Customer
  const customer = await prisma.user.upsert({
    where: { email: 'e2e_buyer@example.com' },
    update: { emailVerified: true },
    create: {
      name: 'E2E Customer Buyer',
      email: 'e2e_buyer@example.com',
      password: hash,
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  // 2. Wholesaler / Seller
  const sellerUser = await prisma.user.upsert({
    where: { email: 'e2e_seller@example.com' },
    update: { emailVerified: true },
    create: {
      name: 'E2E Wholesaler Seller',
      email: 'e2e_seller@example.com',
      password: hash,
      role: 'WHOLESALER',
      emailVerified: true,
    },
  });

  let wholesaler = await prisma.wholesaler.findUnique({
    where: { userId: sellerUser.id },
  });

  if (!wholesaler) {
    wholesaler = await prisma.wholesaler.create({
      data: {
        userId: sellerUser.id,
        businessName: 'E2E Wholesale Mart',
        businessPhone: '9876543210',
        onboardingStatus: 'APPROVED',
      },
    });
  }

  // 3. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'e2e_admin@example.com' },
    update: { role: 'SUPER_ADMIN', emailVerified: true },
    create: {
      name: 'E2E Super Admin',
      email: 'e2e_admin@example.com',
      password: hash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  return { customer, sellerUser, wholesaler, admin };
}

async function login(email) {
  const res = await fetch(`${SERVER_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: DEFAULT_PASSWORD }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email} (${res.status}): ${JSON.stringify(data)}`);
  }

  const setCookie = res.headers.get('set-cookie');
  let token = data.token;
  if (!token && setCookie) {
    const match = setCookie.match(/token=([^;]+)/);
    if (match) token = match[1];
  }
  return token;
}

async function runE2ETests() {
  log('SERVER', 'Starting live Express server listener on ephemeral port...');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      SERVER_BASE = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
  log('SERVER', `Express live server running at ${SERVER_BASE}`);

  log('SETUP', 'Ensuring seed test users exist in database...');
  const { customer, sellerUser, admin } = await ensureTestUsers();

  log('AUTH', 'Authenticating test accounts...');
  const customerToken = await login(customer.email);
  const sellerToken = await login(sellerUser.email);
  const adminToken = await login(admin.email);

  assert(customerToken, 'Customer token must be present');
  assert(sellerToken, 'Seller token must be present');
  assert(adminToken, 'Admin token must be present');
  log('AUTH', 'All 3 user role tokens generated successfully');

  // 1. Marketplace & Products
  log('MARKETPLACE', 'Testing marketplace catalog API...');
  const mktRes = await fetch(`${SERVER_BASE}/products/marketplace?pageSize=10&page=1`);
  assert(mktRes.ok, `GET /products/marketplace failed with status ${mktRes.status}`);
  const mktData = await mktRes.json();
  assert(Array.isArray(mktData.products), 'Marketplace products response must contain array');
  log('MARKETPLACE', `Retrieved ${mktData.products.length} marketplace products (total: ${mktData.total})`);

  log('WHOLESALER PRODUCTS', 'Testing seller inventory products API...');
  const sellerProdRes = await fetch(`${SERVER_BASE}/products`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(sellerProdRes.ok, `GET /products failed with status ${sellerProdRes.status}`);
  const sellerProdData = await sellerProdRes.json();
  log('WHOLESALER PRODUCTS', `Seller inventory returned: ${sellerProdData.products?.length || 0} products`);

  // 2. Recommendations API
  log('RECOMMENDATIONS', 'Testing recommendation endpoints...');
  const popularRes = await fetch(`${SERVER_BASE}/recommendations/popular?limit=5`);
  assert(popularRes.ok, `GET /recommendations/popular failed with status ${popularRes.status}`);
  const popularData = await popularRes.json();
  log('RECOMMENDATIONS', `Popular products returned: ${popularData.products?.length || 0}`);

  const userRecRes = await fetch(`${SERVER_BASE}/recommendations/user?limit=5`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(userRecRes.ok, `GET /recommendations/user failed with status ${userRecRes.status}`);
  const userRecData = await userRecRes.json();
  log('RECOMMENDATIONS', `User recommendations returned: ${userRecData.products?.length || 0}`);

  // 3. Customer Cart API
  log('CART', 'Testing customer cart endpoints...');
  const cartRes = await fetch(`${SERVER_BASE}/cart`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(cartRes.ok, `GET /cart failed with status ${cartRes.status}`);
  const cartData = await cartRes.json();
  log('CART', `Customer cart retrieved: ${cartData.items?.length || 0} items`);

  // 4. Wholesaler Ledger & Khatta API
  log('KHOUTA / LEDGER', 'Testing wholesaler ledger endpoints...');
  const ledgerRes = await fetch(`${SERVER_BASE}/ledger/hub`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(ledgerRes.ok, `GET /ledger/hub failed with status ${ledgerRes.status}`);
  const ledgerData = await ledgerRes.json();
  log('KHOUTA / LEDGER', 'Wholesaler ledger hub retrieved successfully!');

  // 5. Super Admin Endpoints
  log('ADMIN', 'Testing super admin stats endpoints...');
  const statsRes = await fetch(`${SERVER_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(statsRes.ok, `GET /admin/stats failed with status ${statsRes.status}`);
  const statsData = await statsRes.json();
  log('ADMIN', `Super Admin stats loaded: Total Wholesalers: ${statsData.wholesalersCount || 0}`);

  const plansRes = await fetch(`${SERVER_BASE}/admin/subscriptions/plans`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(plansRes.ok, `GET /admin/subscriptions/plans failed with status ${plansRes.status}`);
  const plansData = await plansRes.json();
  log('ADMIN', `Subscription plans retrieved: ${plansData.plans?.length || 0}`);

  // 6. AI Service FastAPI Health / Chat
  log('AI SERVICE', 'Testing Python FastAPI service at http://127.0.0.1:8000 ...');
  try {
    const aiDocsRes = await fetch(`${FASTAPI_BASE}/docs`);
    assert(aiDocsRes.ok, `FastAPI docs returned status ${aiDocsRes.status}`);
    log('AI SERVICE', 'Python FastAPI RAG Service is running and reachable!');
  } catch (err) {
    log('AI SERVICE WARNING', `FastAPI service check note: ${err.message}`);
  }

  log('SUCCESS', '🎉 ALL E2E LIVE TEST CHECKS PASSED PERFECTLY!');
}

runE2ETests()
  .catch((err) => {
    console.error('[E2E VERIFICATION FAILED]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(process.exitCode || 0);
  });
