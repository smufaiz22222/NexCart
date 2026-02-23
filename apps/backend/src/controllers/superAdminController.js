import { prisma } from '../config/db.js';

// --- GET ALL WHOLESALERS (GLOBAL OVERSIGHT) ---
export const getAllWholesalers = async (req, res) => {
  try {
    // We don't filter by wholesalerId here because this is the Super Admin!
    const wholesalers = await prisma.wholesaler.findMany({
      include: {
        user: { select: { email: true, createdAt: true, role: true } },
        _count: {
          select: { customers: true, products: true, orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ count: wholesalers.length, wholesalers });
  } catch (error) {
    console.error('Get All Wholesalers Error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesalers' });
  }
};

// --- GET SPECIFIC TENANT DATA (DRILL DOWN) ---
export const getTenantData = async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    // The Super Admin passes the target wholesalerId in the URL parameters
    // to inspect a specific tenant's completely isolated data.
    const tenantDetails = await prisma.wholesaler.findUnique({
      where: { id: wholesalerId },
      include: {
        user: { select: { email: true } },
        products: { select: { id: true, name: true, currentStock: true, price: true } },
        orders: { 
          select: { id: true, status: true, totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10 // Just grab the 10 most recent orders for the overview
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!tenantDetails) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({ tenant: tenantDetails });
  } catch (error) {
    console.error('Get Tenant Data Error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
};

// --- GET GLOBAL PLATFORM STATS ---
export const getGlobalStats = async (req, res) => {
  try {
    // Run multiple aggregation queries in parallel for maximum speed
    const [totalWholesalers, totalCustomers, totalOrders, totalRevenue] = await Promise.all([
      prisma.wholesaler.count(),
      prisma.customer.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true }
      })
    ]);

    res.status(200).json({
      totalWholesalers,
      totalCustomers,
      totalOrders,
      totalPlatformRevenue: totalRevenue._sum.totalAmount || 0
    });
  } catch (error) {
    console.error('Global Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
};