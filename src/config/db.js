import 'dotenv/config';
import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
let prismaClient = new PrismaClient({ adapter });

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
