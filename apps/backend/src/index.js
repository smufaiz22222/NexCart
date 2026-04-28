import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './config/db.js';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js'; 
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js'; 
import ledgerRoutes from './routes/ledgerRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import khattaRoutes from './routes/khattaRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

console.log("ENV TEST:", process.env.JWT_SECRET);
const app = express();
const PORT = process.env.PORT || 5000;

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
app.use('/api/ledger', ledgerRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/khatta', khattaRoutes);
app.use('/api/stats', statsRoutes);

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});