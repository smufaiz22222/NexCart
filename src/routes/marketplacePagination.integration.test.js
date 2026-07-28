import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

const tag = `pagetest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupFixture = async (fixture) => {
  if (!fixture) return;
  await prisma.review.deleteMany({ where: { productId: { in: fixture.productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: fixture.productIds } } });
  await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  await prisma.user.deleteMany({ where: { id: fixture.wholesalerUserId } });
};

test('Marketplace Products Pagination, Search, Filter, and Sort API', async () => {
  // 1. Create a Wholesaler User and Wholesaler profile
  const wholesalerUser = await prisma.user.create({
    data: {
      email: `${tag}-seller@example.com`,
      password: 'password',
      name: 'Pagination Test Seller',
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: wholesalerUser.id,
      businessName: `${tag} Pagination Wholesale`,
    },
  });

  // 2. Create multiple products for testing pagination
  const categories = [`${tag}-A`, `${tag}-B`];
  const productsData = [
    { name: `${tag}-Product-1`, price: 100, category: categories[0] },
    { name: `${tag}-Product-2`, price: 150, category: categories[0] },
    { name: `${tag}-Special-3`, price: 200, category: categories[1] },
    { name: `${tag}-Product-4`, price: 250, category: categories[1] },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: item.name,
        price: item.price,
        category: item.category,
        currentStock: 10,
        minStock: 1,
      },
    });
    createdProducts.push(product);
  }

  // Create some reviews for sorting tests
  await prisma.review.create({
    data: {
      productId: createdProducts[2].id, // Special-3
      userId: wholesalerUser.id, // review by wholesaler
      rating: 5,
      comment: 'Excellent',
    },
  });

  const fixture = {
    wholesalerUserId: wholesalerUser.id,
    wholesalerId: wholesaler.id,
    productIds: createdProducts.map((p) => p.id),
  };

  try {
    // A. Verify pagination page and pageSize parameters
    const pageResponse = await request(app)
      .get('/api/products/marketplace')
      .query({ page: 1, pageSize: 2 });

    assert.equal(pageResponse.status, 200);
    assert.equal(pageResponse.body.pageSize, 2);
    assert.equal(pageResponse.body.page, 1);
    assert.ok(pageResponse.body.totalCount >= 4);
    assert.equal(pageResponse.body.products.length, 2);

    // B. Verify category filtering
    const categoryResponse = await request(app)
      .get('/api/products/marketplace')
      .query({ category: categories[0] });

    assert.equal(categoryResponse.status, 200);
    const categoryProducts = categoryResponse.body.products.filter((p) =>
      fixture.productIds.includes(p.id)
    );
    assert.equal(categoryProducts.length, 2);
    assert.ok(categoryProducts.every((p) => p.category === categories[0]));

    // C. Verify search filtering (matching name case-insensitively)
    const searchResponse = await request(app)
      .get('/api/products/marketplace')
      .query({ search: 'Special' });

    assert.equal(searchResponse.status, 200);
    const searchProducts = searchResponse.body.products.filter((p) =>
      fixture.productIds.includes(p.id)
    );
    assert.equal(searchProducts.length, 1);
    assert.equal(searchProducts[0].name, `${tag}-Special-3`);

    // D. Verify sorting by top rated (Product 3 has 5 star rating, others have 0)
    const sortResponse = await request(app)
      .get('/api/products/marketplace')
      .query({ sortBy: 'topRated' });

    assert.equal(sortResponse.status, 200);
    // Find index of Product 3 (Special-3) and others in returned products list
    const returnedProductIds = sortResponse.body.products.map((p) => p.id);
    const indexSpecial3 = returnedProductIds.indexOf(createdProducts[2].id);
    const indexProduct1 = returnedProductIds.indexOf(createdProducts[0].id);

    // Special-3 must be sorted before Product 1 because it has a higher average rating (5 vs 0)
    assert.ok(indexSpecial3 >= 0);
    assert.ok(indexProduct1 >= 0);
    assert.ok(indexSpecial3 < indexProduct1);
  } finally {
    await cleanupFixture(fixture);
  }
});
