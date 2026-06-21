import { prisma } from '../src/config/db.js';
import { getRfqs } from '../src/controllers/b2bController.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'groceries@example.com' },
    include: { wholesalerProfile: true },
  });

  const req = {
    user: {
      userId: user.id,
      role: user.role,
      wholesalerId: user.wholesalerProfile.id,
    },
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(
        'Controller Response (Status:',
        this.statusCode || 200,
        '):',
        JSON.stringify(data, null, 2)
      );
    },
  };

  await getRfqs(req, res);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
