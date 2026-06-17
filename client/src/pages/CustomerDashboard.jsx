import useAuthStore from '../store/authStore';
import BusinessDashboard from './BusinessDashboard';
import RetailDashboard from './RetailDashboard';

export default function CustomerDashboard() {
  const { user } = useAuthStore();

  const isB2BApproved =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  if (isB2BApproved) {
    return <BusinessDashboard />;
  }

  return <RetailDashboard />;
}
