import { spawn } from 'node:child_process';

const steps = [
  [process.execPath, ['prisma/seed.js']],
  [process.execPath, ['prisma/seedRecommendationDemo.js']],
  [process.execPath, ['src/jobs/buildContentRecommendations.js']],
  [process.execPath, ['src/jobs/buildCollaborativeRecommendations.js']],
  [process.execPath, ['src/jobs/buildPopularityRecommendations.js']],
  [process.execPath, ['src/jobs/benchmarkRecommendations.js']],
];

const runStep = ([command, args]) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Step failed: ${command} ${args.join(' ')}`));
    });
  });

try {
  for (const step of steps) {
    await runStep(step);
  }

  console.log('Recommendation demo dataset prepared successfully.');
} catch (error) {
  console.error('Failed to prepare recommendation demo dataset:', error);
  process.exitCode = 1;
}
