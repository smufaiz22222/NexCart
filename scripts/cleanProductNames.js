/**
 * cleanProductNames.js
 * Removes "vol" followed by digits (e.g. "vol1", "Vol 2", "VOL3") from all product names.
 * Run with: node scripts/cleanProductNames.js
 */

import { prisma, getPrismaClient } from '../src/config/db.js';

// Regex: optional whitespace + "vol" (case-insensitive) + optional whitespace + digits
//        matches patterns like "vol1", " vol 2", "VOL3", " Vol. 4", etc.
const VOL_PATTERN = /\s*vol\.?\s*\d+/gi;

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
  });

  let updatedCount = 0;

  for (const product of products) {
    if (!VOL_PATTERN.test(product.name)) {
      VOL_PATTERN.lastIndex = 0; // reset stateful regex
      continue;
    }
    VOL_PATTERN.lastIndex = 0;

    const cleanedName = product.name.replace(VOL_PATTERN, '').trim();

    await prisma.product.update({
      where: { id: product.id },
      data: { name: cleanedName },
    });

    console.log(`  [${product.id}] "${product.name}" → "${cleanedName}"`);
    updatedCount++;
  }

  console.log(`\nDone. Updated ${updatedCount} / ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
