import { prisma } from '../config/db.js';
import { getPopularProducts } from '../services/popularityService.js';

try {
  const trending = await getPopularProducts({ scope: 'trending', limit: 12 });
  const allTime = await getPopularProducts({ scope: 'allTime', limit: 12 });
  console.log('Popularity recommendations checked:', {
    trending: trending.length,
    allTime: allTime.length,
  });
} catch (error) {
  console.error('Failed to check popularity recommendations:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
