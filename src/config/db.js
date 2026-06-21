import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const basePrismaClient = new PrismaClient({ adapter });

async function updateCachedBalance(client, wholesalerId, userId) {
  if (!wholesalerId || !userId) return;
  const aggregation = await client.ledgerEntry.aggregate({
    where: { wholesalerId, userId },
    _sum: { amount: true },
  });
  const balance = aggregation._sum.amount ? aggregation._sum.amount : 0.0;
  await client.wholesalerCreditLimit.upsert({
    where: {
      wholesalerId_buyerId: { wholesalerId, buyerId: userId },
    },
    update: {
      balance,
    },
    create: {
      wholesalerId,
      buyerId: userId,
      balance,
      creditLimit: 50000.0,
    },
  });
}

let prismaClient = basePrismaClient.$extends(
  Prisma.defineExtension((client) => {
    return client.$extends({
      query: {
        ledgerEntry: {
          async create({ model: _model, operation: _operation, args, query }) {
            const result = await query(args);
            try {
              if (result && result.wholesalerId && result.userId) {
                await updateCachedBalance(client, result.wholesalerId, result.userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in create:', err);
            }
            return result;
          },
          async createMany({ model: _model, operation: _operation, args, query }) {
            const result = await query(args);
            try {
              if (args && Array.isArray(args.data)) {
                const pairs = new Set();
                for (const item of args.data) {
                  if (item.wholesalerId && item.userId) {
                    pairs.add(`${item.wholesalerId}:${item.userId}`);
                  }
                }
                for (const pair of pairs) {
                  const [wholesalerId, userId] = pair.split(':');
                  await updateCachedBalance(client, wholesalerId, userId);
                }
              }
            } catch (err) {
              console.error('Error updating cached balance in createMany:', err);
            }
            return result;
          },
          async update({ model: _model, operation: _operation, args, query }) {
            const result = await query(args);
            try {
              if (result && result.wholesalerId && result.userId) {
                await updateCachedBalance(client, result.wholesalerId, result.userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in update:', err);
            }
            return result;
          },
          async updateMany({ model: _model, operation: _operation, args, query }) {
            let entries = [];
            try {
              entries = await client.ledgerEntry.findMany({
                where: args.where,
                select: { wholesalerId: true, userId: true },
              });
            } catch (err) {
              console.error('Error pre-fetching updated entries:', err);
            }
            const result = await query(args);
            try {
              const pairs = new Set();
              for (const item of entries) {
                if (item.wholesalerId && item.userId) {
                  pairs.add(`${item.wholesalerId}:${item.userId}`);
                }
              }
              for (const pair of pairs) {
                const [wholesalerId, userId] = pair.split(':');
                await updateCachedBalance(client, wholesalerId, userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in updateMany:', err);
            }
            return result;
          },
          async upsert({ model: _model, operation: _operation, args, query }) {
            const result = await query(args);
            try {
              if (result && result.wholesalerId && result.userId) {
                await updateCachedBalance(client, result.wholesalerId, result.userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in upsert:', err);
            }
            return result;
          },
          async delete({ model: _model, operation: _operation, args, query }) {
            const result = await query(args);
            try {
              if (result && result.wholesalerId && result.userId) {
                await updateCachedBalance(client, result.wholesalerId, result.userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in delete:', err);
            }
            return result;
          },
          async deleteMany({ model: _model, operation: _operation, args, query }) {
            let entries = [];
            try {
              entries = await client.ledgerEntry.findMany({
                where: args.where,
                select: { wholesalerId: true, userId: true },
              });
            } catch (err) {
              console.error('Error pre-fetching deleted entries:', err);
            }
            const result = await query(args);
            try {
              const pairs = new Set();
              for (const item of entries) {
                if (item.wholesalerId && item.userId) {
                  pairs.add(`${item.wholesalerId}:${item.userId}`);
                }
              }
              for (const pair of pairs) {
                const [wholesalerId, userId] = pair.split(':');
                await updateCachedBalance(client, wholesalerId, userId);
              }
            } catch (err) {
              console.error('Error updating cached balance in deleteMany:', err);
            }
            return result;
          },
        },
      },
    });
  })
);

export const prisma = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      const value = prismaClient[prop];
      return typeof value === 'function' ? value.bind(prismaClient) : value;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }
);

export const getPrismaClient = () => prismaClient;

export const setPrismaClient = (nextClient) => {
  prismaClient = nextClient;
};
