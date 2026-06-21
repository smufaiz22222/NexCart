import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { prisma } from './config/db.js';
import { globalLimiter } from './middlewares/rateLimiter.js';

import addressRoutes from './routes/addressRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import b2bCartRoutes from './routes/b2bCartRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import khattaRoutes from './routes/khattaRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import b2bRoutes from './routes/b2bRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use('/api/orders/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use('/api/khatta', express.json({ limit: '50mb' }));
app.use('/api/khatta', express.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/b2b-cart', b2bCartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/khatta', khattaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/notifications', notificationRoutes);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

export default app;
