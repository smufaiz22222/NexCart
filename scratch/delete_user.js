import { prisma } from '../src/config/db.js';

async function remove() {
  const email = 'smufaiz1234@gmail.com';

  // Clean up OTPs first
  await prisma.emailOTP.deleteMany({
    where: { email },
  });
  console.log('Cleaned up OTP records for:', email);

  // Delete the user
  try {
    const deletedUser = await prisma.user.delete({
      where: { email },
    });
    console.log('Successfully deleted user account:', deletedUser.email);
  } catch (err) {
    console.log('User account not found or already deleted:', err.message);
  }
}

remove()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
