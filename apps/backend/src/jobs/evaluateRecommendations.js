import { prisma } from '../config/db.js';
import { evaluateRecommendations } from '../services/evaluationService.js';

try {
  const metrics = await evaluateRecommendations({ k: 5 });
  console.log('Recommendation evaluation:', metrics);
} catch (error) {
  console.error('Failed to evaluate recommendations:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
