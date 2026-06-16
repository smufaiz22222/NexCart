import { prisma } from '../config/db.js';
import { buildCollaborativeRecommendations } from '../services/collaborativeFilteringService.js';

try {
  const result = await buildCollaborativeRecommendations({ topK: 10 });
  console.log('Collaborative recommendations rebuilt:', result);
} catch (error) {
  console.error('Failed to build collaborative recommendations:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
