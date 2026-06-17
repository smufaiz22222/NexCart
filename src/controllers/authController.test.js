import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { getPrismaClient, setPrismaClient } from '../config/db.js';
import { login, register } from './authController.js';

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

const createRegisterPrismaMock = ({ existingUser = null, createError = null } = {}) => {
  const createdUsers = [];
  const seededPlans = new Map();

  return {
    state: { createdUsers, seededPlans },
    client: {
      subscriptionPlan: {
        upsert: async ({ where, update, create }) => {
          const code = where?.code;
          const existingPlan = seededPlans.get(code);
          const nextPlan = existingPlan
            ? { ...existingPlan, ...update }
            : { id: `plan-${seededPlans.size + 1}`, ...create };

          seededPlans.set(code, nextPlan);
          return nextPlan;
        },
      },
      user: {
        findFirst: async ({ where }) => {
          const candidate = where?.email?.equals;
          if (
            existingUser &&
            String(existingUser.email || '').toLowerCase() === String(candidate || '').toLowerCase()
          ) {
            return existingUser;
          }

          return (
            createdUsers.find(
              (user) =>
                String(user.email || '').toLowerCase() === String(candidate || '').toLowerCase()
            ) || null
          );
        },
        create: async ({ data, include }) => {
          if (createError) {
            throw createError;
          }

          const createdUser = {
            id: `user-${createdUsers.length + 1}`,
            ...data,
            wholesalerProfile: data.wholesalerProfile?.create
              ? {
                  id: `wholesaler-${createdUsers.length + 1}`,
                  subscriptions: [],
                  ...data.wholesalerProfile.create,
                }
              : null,
          };

          createdUsers.push(createdUser);

          if (include?.wholesalerProfile) {
            return createdUser;
          }

          return createdUser;
        },
      },
    },
  };
};

const createLoginPrismaMock = ({ user = null } = {}) => ({
  client: {
    user: {
      findFirst: async ({ where }) => {
        const candidate = where?.email?.equals;
        if (!user) {
          return null;
        }

        return String(user.email || '').toLowerCase() === String(candidate || '').toLowerCase()
          ? user
          : null;
      },
    },
  },
});

test('register creates a customer account with normalized email', async () => {
  const originalClient = getPrismaClient();
  const { client, state } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const req = {
      body: {
        name: '  Jane Doe  ',
        email: '  Jane.Doe@Example.com ',
        password: 'Valid@123',
      },
    };
    const res = createMockResponse();

    await register(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, 'Registration successful. Please log in.');
    assert.equal(state.createdUsers.length, 1);
    assert.equal(state.createdUsers[0].name, 'Jane Doe');
    assert.equal(state.createdUsers[0].email, 'jane.doe@example.com');
    assert.equal(state.createdUsers[0].role, 'CUSTOMER');
    assert.notEqual(state.createdUsers[0].password, 'Valid@123');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register creates a wholesaler account when business name is provided', async () => {
  const originalClient = getPrismaClient();
  const { client, state } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const req = {
      body: {
        name: 'Seller One',
        email: 'seller@example.com',
        password: 'Strong@123',
        role: 'WHOLESALER',
        businessName: '  Seller Hub  ',
        businessPhone: '9876543210',
        businessAddress: '221 Market Road, Pune',
      },
    };
    const res = createMockResponse();

    await register(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.applicationSubmitted, true);
    assert.equal(state.createdUsers[0].role, 'WHOLESALER');
    assert.equal(state.createdUsers[0].wholesalerProfile.businessName, 'Seller Hub');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects missing required fields', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const scenarios = [
      [{ email: 'test@example.com', password: 'Strong@123' }, 'Full name is required'],
      [{ name: 'Jane', password: 'Strong@123' }, 'Email is required'],
      [{ name: 'Jane', email: 'test@example.com' }, 'Password is required'],
    ];

    for (const [body, message] of scenarios) {
      const res = createMockResponse();
      await register({ body }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error, message);
    }
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects invalid email format', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Jane',
          email: 'not-an-email',
          password: 'Strong@123',
        },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Enter a valid email address');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects each password policy failure', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const scenarios = [
      ['Short1!', 'Password must be at least 8 characters long'],
      ['lowercase1!', 'Password must include at least one uppercase letter'],
      ['UPPERCASE1!', 'Password must include at least one lowercase letter'],
      ['NoNumber!', 'Password must include at least one number'],
      ['NoSpecial1', 'Password must include at least one special character'],
    ];

    for (const [password, message] of scenarios) {
      const res = createMockResponse();
      await register(
        {
          body: {
            name: 'Jane',
            email: `user${Math.random()}@example.com`,
            password,
          },
        },
        res
      );

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error, message);
    }
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects unsupported roles', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Strong@123',
          role: 'SUPER_ADMIN',
        },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Invalid account type selected');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects wholesalers without business name', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock();

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Seller',
          email: 'seller@example.com',
          password: 'Strong@123',
          role: 'WHOLESALER',
        },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Business name is required for wholesalers');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register rejects duplicate email even when casing differs', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock({
    existingUser: {
      id: 'existing-1',
      email: 'Existing.User@Example.com',
    },
  });

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Jane',
          email: 'existing.user@example.com',
          password: 'Strong@123',
        },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Email already in use');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register returns duplicate email error when database unique constraint is hit during create', async () => {
  const originalClient = getPrismaClient();
  const duplicateError = new Error('Unique constraint failed');
  duplicateError.code = 'P2002';
  const { client } = createRegisterPrismaMock({ createError: duplicateError });

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Strong@123',
        },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Email already in use');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('register returns a meaningful server error when user creation fails unexpectedly', async () => {
  const originalClient = getPrismaClient();
  const { client } = createRegisterPrismaMock({ createError: new Error('database offline') });

  try {
    setPrismaClient(client);

    const res = createMockResponse();
    await register(
      {
        body: {
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Strong@123',
        },
      },
      res
    );

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Registration failed. Please try again.');
  } finally {
    setPrismaClient(originalClient);
  }
});

test('login allows differently cased email input after normalization', async () => {
  const originalClient = getPrismaClient();
  const hashedPassword = await bcrypt.hash('Valid@123', 10);
  const { client } = createLoginPrismaMock({
    user: {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      wholesalerProfile: null,
    },
  });
  const originalSecret = process.env.JWT_SECRET;

  try {
    process.env.JWT_SECRET = 'test-secret';
    setPrismaClient(client);

    const res = createMockResponse();
    await login(
      {
        body: {
          email: '  Jane.Doe@Example.com ',
          password: 'Valid@123',
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.email, 'jane.doe@example.com');
    assert.equal(typeof res.body.token, 'string');
  } finally {
    process.env.JWT_SECRET = originalSecret;
    setPrismaClient(originalClient);
  }
});
