import app from './app.js';
import { startTokenCleanupInterval } from './jobs/tokenCleanupJob.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});

startTokenCleanupInterval();
