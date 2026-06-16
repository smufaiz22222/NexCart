import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';
const password = '1234';

const ensureSuperAdmin = async () => {
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: hashedPassword, role: 'SUPER_ADMIN' },
    create: {
      name: 'Recommendation Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });
};

const login = async (email) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.token;
};

const getStatus = async (token, path) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.status;
};

const assertStatus = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
};

try {
  await ensureSuperAdmin();

  const customerToken = await login('buyer@example.com');
  const wholesalerToken = await login('tech@example.com');
  const adminToken = await login('admin@example.com');

  const results = {
    customerAnalytics: await getStatus(customerToken, '/recommendations/analytics'),
    customerEvaluation: await getStatus(customerToken, '/recommendations/evaluation?store=false'),
    wholesalerAnalytics: await getStatus(wholesalerToken, '/recommendations/analytics'),
    wholesalerEvaluation: await getStatus(
      wholesalerToken,
      '/recommendations/evaluation?store=false'
    ),
    adminAnalytics: await getStatus(adminToken, '/recommendations/analytics'),
    adminEvaluation: await getStatus(adminToken, '/recommendations/evaluation?store=false'),
  };

  assertStatus(results.customerAnalytics, 403, 'customer analytics');
  assertStatus(results.customerEvaluation, 403, 'customer evaluation');
  assertStatus(results.wholesalerAnalytics, 200, 'wholesaler analytics');
  assertStatus(results.wholesalerEvaluation, 403, 'wholesaler evaluation');
  assertStatus(results.adminAnalytics, 200, 'admin analytics');
  assertStatus(results.adminEvaluation, 200, 'admin evaluation');

  console.log('Recommendation access checks passed:', results);
} catch (error) {
  console.error('Recommendation access checks failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
