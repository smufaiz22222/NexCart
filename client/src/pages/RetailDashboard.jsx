import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, useUserRecommendations } from '../api/queries';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import {
  RetailDashboardSkeleton,
  RetailGreetingBanner,
  RetailMetricsGrid,
  RetailAnalyticsSection,
  RetailFulfillmentTracker,
  RetailActivityAndSupportSection,
  RetailRecommendationsGrid,
} from '../components/dashboard/RetailDashboardComponents';

const getStepperStatus = (status) => {
  const steps = [
    { key: 'PENDING', label: 'Order Placed', desc: 'Awaiting seller acceptance' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Packing & inspection' },
    { key: 'SHIPPED', label: 'In Transit', desc: 'Dispatched with logistics' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Receipt confirmed' },
  ];

  const statusIndexMap = {
    PENDING: 0,
    PROCESSING: 1,
    SHIPPED: 2,
    DELIVERED: 3,
    RETURN_COMPLETED: 3,
    CANCELLED: -1,
  };

  const currentIndex = statusIndexMap[status] ?? 0;

  return steps.map((step, idx) => ({
    ...step,
    isCompleted: idx < currentIndex,
    isActive: idx === currentIndex,
    isPending: idx > currentIndex,
  }));
};

const SUPPORT_FAQS = [
  {
    q: 'How do I request a return or a refund?',
    a: 'Go to your Orders panel, select the specific item in your purchase history, and click "Request Return". Fill in the reason and return quantity.',
  },
  {
    q: 'How long does shipment and delivery take?',
    a: 'Processing takes 24-48 hours. Transit time ranges from 3 to 5 business days depending on your postal code location.',
  },
  {
    q: 'How do I upgrade to B2B Wholesale status?',
    a: 'Click on the "Join B2B Wholesale" banner at the top of the dashboard and submit your company GST details and verification info.',
  },
];

export default function RetailDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cartTotalItems = useCartStore((state) => state.getTotalItems());

  // Local state for interactive components
  const [isOrderItemsExpanded, setIsOrderItemsExpanded] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Fetch standard B2C queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: recommendationsData, isLoading: recsLoading } = useUserRecommendations();

  // Filter standard customer orders
  const activeOrders = useMemo(
    () => orders.filter((order) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => ['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)),
    [orders]
  );

  const latestOrder = useMemo(
    () =>
      orders.length > 0
        ? orders.toSorted((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null,
    [orders]
  );

  const recommendedItems = recommendationsData?.recommendations || [];

  // Loyalty Tier Computation
  const completedCount = completedOrders.length;
  const loyaltyTier = useMemo(() => {
    if (completedCount >= 8) {
      return {
        name: 'Gold VIP Member',
        badgeClass: 'bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]',
        perk: '10% member cashback & priority shipping active',
      };
    }
    if (completedCount >= 4) {
      return {
        name: 'Silver Elite Member',
        badgeClass: 'bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]',
        perk: '5% store-wide discount active',
      };
    }
    if (completedCount >= 1) {
      return {
        name: 'Bronze Member',
        badgeClass: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]',
        perk: 'Standard wholesale tier eligibility',
      };
    }
    return {
      name: 'Retail Member',
      badgeClass: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]',
      perk: 'Start shopping to unlock reward tiers',
    };
  }, [completedCount]);

  // Spending Analytics calculations
  const totalSpent = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
  }, [completedOrders]);

  const categorySplit = useMemo(() => {
    const counts = {};
    orders.forEach((order) => {
      if (order.status !== 'CANCELLED') {
        order.items?.forEach((item) => {
          const category = item.product?.category || 'General';
          const subtotal = parseFloat(item.subtotalAtPurchase || item.price * item.quantity || 0);
          counts[category] = (counts[category] || 0) + subtotal;
        });
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); // top 3
  }, [orders]);

  const monthlySpendData = useMemo(() => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const now = new Date();
    const result = [];

    // Create list of past 6 months chronologically
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      result.push({ key, label: key, amount: 0 });
    }

    orders.forEach((order) => {
      if (['DELIVERED', 'SHIPPED', 'PROCESSING', 'RETURN_COMPLETED'].includes(order.status)) {
        const date = new Date(order.createdAt);
        const key = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
        const index = result.findIndex((item) => item.key === key);
        if (index !== -1) {
          result[index].amount += parseFloat(order.totalAmount || 0);
        }
      }
    });

    const maxAmount = Math.max(...result.map((r) => r.amount), 1000); // minimum scale is 1000
    return result.map((r) => ({
      ...r,
      heightPercent: Math.min(Math.round((r.amount / maxAmount) * 100), 100),
    }));
  }, [orders]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const activities = [];
    orders.forEach((order) => {
      const originalAmount =
        order.items?.reduce(
          (sum, item) =>
            sum + parseFloat(item.subtotalAtPurchase || item.price * item.quantity || 0),
          0
        ) || order.totalAmount;

      activities.push({
        id: `place-${order.id}`,
        timestamp: new Date(order.createdAt),
        title: 'Order Initiated',
        description: `Placed order #${order.id.slice(0, 8).toUpperCase()} for ${formatCurrency(originalAmount)}`,
        badgeColor: 'bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]',
      });
      if (['SHIPPED', 'DELIVERED', 'RETURN_COMPLETED'].includes(order.status)) {
        activities.push({
          id: `ship-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Parcel Dispatched',
          description: `Consignment ID #${order.id.slice(0, 8).toUpperCase()} left shipment facility.`,
          badgeColor: 'bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]',
        });
      }
      if (['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)) {
        activities.push({
          id: `deliver-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Package Handed Over',
          description: `Order #${order.id.slice(0, 8).toUpperCase()} signed and verified.`,
          badgeColor: 'bg-[#f0fdf4] text-emerald-800 border border-[#bbf7d0]',
        });
      }
      if (order.status === 'CANCELLED') {
        activities.push({
          id: `cancel-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Order Retracted',
          description: `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled.`,
          badgeColor: 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
        });
      }
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [orders]);

  // Support FAQs

  const trackingSteps = latestOrder ? getStepperStatus(latestOrder.status) : [];
  const latestOrderItems = latestOrder?.items || [];

  if (ordersLoading) {
    return <RetailDashboardSkeleton />;
  }

  return (
    <div className="space-y-8 pb-12 text-[#1e293b] font-sans">
      <RetailGreetingBanner user={user} loyaltyTier={loyaltyTier} />

      <RetailMetricsGrid
        ordersCount={orders.length}
        activeOrdersCount={activeOrders.length}
        cartTotalItems={cartTotalItems}
        totalSpent={totalSpent}
        formatCurrency={formatCurrency}
      />

      <RetailAnalyticsSection
        ordersCount={orders.length}
        monthlySpendData={monthlySpendData}
        categorySplit={categorySplit}
        formatCurrency={formatCurrency}
      />

      <RetailFulfillmentTracker
        latestOrder={latestOrder}
        trackingSteps={trackingSteps}
        latestOrderItems={latestOrderItems}
        isOrderItemsExpanded={isOrderItemsExpanded}
        setIsOrderItemsExpanded={setIsOrderItemsExpanded}
        cartTotalItems={cartTotalItems}
        formatCurrency={formatCurrency}
      />

      <RetailActivityAndSupportSection
        recentActivities={recentActivities}
        supportFaqs={SUPPORT_FAQS}
        openFaqIndex={openFaqIndex}
        setOpenFaqIndex={setOpenFaqIndex}
      />

      <RetailRecommendationsGrid
        recsLoading={recsLoading}
        recommendedItems={recommendedItems}
        navigate={navigate}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}
