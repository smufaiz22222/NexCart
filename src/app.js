import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { prisma } from './config/db.js';

import addressRoutes from './routes/addressRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import khattaRoutes from './routes/khattaRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', database: 'Connected', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/khatta', khattaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

export default app;
