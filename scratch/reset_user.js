import { prisma } from '../src/config/db.js';

async function reset() {
  const email = 'smufaiz1234@gmail.com';

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: false },
  });
  console.log('Successfully reset emailVerified to false for:', user.email);

  // Clean up any existing OTPs
  await prisma.emailOTP.deleteMany({
    where: { email },
  });
  console.log('Cleaned up previous OTP records.');
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
