import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

export default async function seedUsers(prisma) {
  console.log('👥 Seeding users & wholesaler profiles...');

  const hashedPassword = await bcrypt.hash('1234', 10);

  // 1. Create Core Hardcoded Users
  console.log('  - Creating core demo users...');

  await prisma.user.create({
    data: {
      name: 'NexCart Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Buyer',
      email: 'buyer@example.com',
      password: hashedPassword,
      role: 'CUSTOMER',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Tech',
      email: 'tech@example.com',
      password: hashedPassword,
      role: 'WHOLESALER',
      wholesalerProfile: { create: { businessName: 'ElectroHub Pro' } },
    },
    include: { wholesalerProfile: true },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Style',
      email: 'threads@example.com',
      password: hashedPassword,
      role: 'WHOLESALER',
      wholesalerProfile: { create: { businessName: 'Urban Threads' } },
    },
    include: { wholesalerProfile: true },
  });

  // 2. Create additional wholesalers for other categories
  console.log('  - Creating category wholesalers...');
  const categoryWholesalers = [
    { name: 'Diana Grocer', email: 'groceries@example.com', businessName: 'Daily Groceries Co.' },
    { name: 'Ethan Sports', email: 'sports@example.com', businessName: 'Active Sports Gear' },
    { name: 'Fiona Reads', email: 'books@example.com', businessName: 'Bookworm Press' },
    { name: 'Glow Curator', email: 'beauty@example.com', businessName: 'Glow Beauty' },
    { name: 'Henry Home', email: 'home@example.com', businessName: 'Homeware Depot' },
    { name: 'Ian Toys', email: 'toys@example.com', businessName: 'Toyland Wholesalers' },
    { name: 'Jack Auto', email: 'auto@example.com', businessName: 'Apex Auto Parts' },
    { name: 'Kate Office', email: 'office@example.com', businessName: 'Office Express' },
    { name: 'Leo Pets', email: 'pets@example.com', businessName: 'Pet Palace Wholesale' },
  ];

  const wholesalers = [bob.wholesalerProfile, charlie.wholesalerProfile];

  for (const w of categoryWholesalers) {
    const user = await prisma.user.create({
      data: {
        name: w.name,
        email: w.email,
        password: hashedPassword,
        role: 'WHOLESALER',
        wholesalerProfile: { create: { businessName: w.businessName } },
      },
      include: { wholesalerProfile: true },
    });
    wholesalers.push(user.wholesalerProfile);
  }

  // 3. Generate 40 fake customer users
  console.log('  - Generating 40 fake customer users with Faker...');
  const customerData = [];
  for (let i = 0; i < 40; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    customerData.push({
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
    });
  }

  // Create fake customers concurrently in a transaction to return their created objects
  const createdCustomers = await prisma.$transaction(
    customerData.map((data) => prisma.user.create({ data }))
  );

  const customers = [alice, ...createdCustomers];

  console.log(
    `✅ Seeded ${customers.length} Customers and ${wholesalers.length} Wholesaler profiles.`
  );

  return { customers, wholesalers };
}
