import { PrismaClient } from '../generated/client/index.js';

let prismaClient = new PrismaClient();

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = prismaClient[prop];
      return typeof value === 'function' ? value.bind(prismaClient) : value;
    },
  }
);

export const getPrismaClient = () => prismaClient;

export const setPrismaClient = (nextClient) => {
  prismaClient = nextClient;
};
