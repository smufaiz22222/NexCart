import { PrismaClient } from '../src/generated/client/index.js';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:qwerty@localhost:5433/nexcart_db?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const result = await prisma.user.updateMany({
    data: {
      emailVerified: true,
    },
  });
  console.log(`Successfully updated ${result.count} existing users to emailVerified = true.`);
  await prisma.$disconnect();
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
