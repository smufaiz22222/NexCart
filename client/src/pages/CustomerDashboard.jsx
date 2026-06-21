import useAuthStore from '../store/authStore';
import BusinessDashboard from './BusinessDashboard';
import RetailDashboard from './RetailDashboard';

export default function CustomerDashboard() {
  const { user } = useAuthStore();

  const hasApprovedB2BAccess =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  if (hasApprovedB2BAccess) {
    return <BusinessDashboard />;
  }

  return <RetailDashboard />;
}
