import 'dotenv/config';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('1234', 10);
const user = await prisma.user.create({
  data: {
    name: 'Super Admin',
    email: 'smufaiz2222@gmail.com',
    password: hash,
    role: 'SUPER_ADMIN',
    emailVerified: true,
  },
});
console.log('Created super admin:', user.email, user.role);
await prisma.$disconnect();
