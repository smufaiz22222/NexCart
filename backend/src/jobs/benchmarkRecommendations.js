import { prisma } from '../config/db.js';
import { evaluateRecommendations } from '../services/evaluationService.js';

const ks = [5, 10];

try {
  const reports = [];

  for (const k of ks) {
    const metrics = await evaluateRecommendations({
      k,
      storeReport: true,
      notes: `Benchmark run for Precision@${k}, Recall@${k}, MAP@${k}, NDCG@${k}, coverage, and diversity`,
    });
    reports.push({ k, metrics });
  }

  console.log('Recommendation benchmark reports:', JSON.stringify(reports, null, 2));
} catch (error) {
  console.error('Failed to benchmark recommendations:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
