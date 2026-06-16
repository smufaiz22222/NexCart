import { prisma } from '../config/db.js';
import { buildContentRecommendations } from '../services/contentRecommendationService.js';

try {
  const result = await buildContentRecommendations({ topK: 10 });
  console.log('Content recommendations rebuilt:', result);
} catch (error) {
  console.error('Failed to build content recommendations:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
