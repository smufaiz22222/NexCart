import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  Hourglass,
  MapPin,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import apiClient from '../api/axios';
import { useB2BRegister } from '../api/queries';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function B2BOnboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const registerB2B = useB2BRegister();

  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    businessAddress: '',
  });
  const [profile, setProfile] = useState(user?.businessProfile || null);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);

  const refreshProfile = useCallback(async () => {
    setIsRefreshingProfile(true);
    try {
      const response = await apiClient.get('/auth/profile');
      const nextUser = response.data.user;
      setUser(nextUser);
      setProfile(nextUser?.businessProfile || null);
      setFormData((current) => ({
        companyName: nextUser?.businessProfile?.companyName || current.companyName,
        taxId: nextUser?.businessProfile?.taxId || current.taxId,
        businessAddress: nextUser?.businessProfile?.businessAddress || current.businessAddress,
      }));
    } catch (error) {
      console.error('Failed to refresh business profile:', error);
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [setUser]);

  useEffect(() => {
    setProfile(user?.businessProfile || null);
  }, [user?.businessProfile]);

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      if (!active) {
        return;
      }

      await refreshProfile();
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, [refreshProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    registerB2B.mutate(formData, {
      onSuccess: (res) => {
        toast.success(res.message || 'Onboarding application submitted successfully!');
        setProfile(res.profile);
        if (user) {
          setUser({
            ...user,
            businessProfile: res.profile,
          });
        }
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to submit onboarding form');
      },
    });
  };

  // 1. RENDER APPROVED STATUS
  if (profile?.verification === 'APPROVED') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#16171a]">
        <div className="swiss-panel p-8">
          <div className="w-16 h-16 bg-[#EFEFEF] border border-[#C0C0C0] text-emerald-800 rounded-md flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#16171a]">
            Business Account Approved
          </h1>
          <p className="text-sm text-[#6C757D] mt-3 leading-6">
            Your business profile for{' '}
            <span className="font-bold text-[#16171a]">{profile.companyName}</span> has been has
            been verified and approved. Your B2B portal is now available separately.
          </p>
          <div className="mt-6 p-5 rounded-md bg-[#EFEFEF]/30 border border-[#C0C0C0] text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C757D]">
              Wholesaler Trade Credit
            </p>
            <p className="text-sm text-[#16171a] mt-2 leading-relaxed">
              Once your business profile is approved, participating wholesalers may independently
              offer trade credit based on your relationship, purchasing history and business
              verification.
            </p>
          </div>
          <button
            onClick={() => navigate('/store/dashboard')}
            className="mt-8 w-full bg-[#0047AB] hover:bg-[#003B91] text-white py-3.5 px-6 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Open B2B Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. RENDER PENDING STATUS (UNDER REVIEW)
  if (profile?.verification === 'APPLIED') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#16171a]">
        <div className="swiss-panel p-8">
          <div className="w-16 h-16 bg-[#EFEFEF] border border-[#C0C0C0] text-amber-800 rounded-md flex items-center justify-center mx-auto mb-6">
            <Hourglass className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#16171a]">
            Application Under Review
          </h1>
          <p className="text-sm text-[#6C757D] mt-3 leading-6">
            Your wholesale profile for{' '}
            <span className="font-bold text-[#16171a]">{profile.companyName}</span> is currently
            pending tax and credentials review.
          </p>
          <div className="mt-6 border-t border-[#C0C0C0] pt-6 text-left space-y-3">
            <div className="flex items-center gap-3 text-xs text-[#6C757D]">
              <Building2 className="w-4 h-4 text-[#6C757D]" />
              <div>
                <span className="font-bold text-[#16171a]">Tax ID / GSTIN:</span>{' '}
                <span className="font-mono">{profile.taxId}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#6C757D]">
              <MapPin className="w-4 h-4 text-[#6C757D]" />
              <div>
                <span className="font-bold text-[#16171a]">Business Location:</span>{' '}
                {profile.businessAddress}
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-md bg-[#EFEFEF]/30 border border-[#C0C0C0] text-xs text-[#6C757D] leading-5">
            Verification checks usually complete in 1-2 business days. Until approved, you can
            continue to place standard retail orders (B2C) on the storefront.
          </div>
          <button
            onClick={() => navigate('/store')}
            className="mt-8 w-full bg-[#0047AB] hover:bg-[#003B91] text-white py-3.5 px-6 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Continue Retail Shopping
          </button>
        </div>
      </div>
    );
  }

  // 3. RENDER REJECTED STATUS / DEFAULT ONBOARDING FORM
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold bg-[#EFEFEF] text-[#0047AB] border border-[#C0C0C0] uppercase tracking-wider">
          <Briefcase className="w-3.5 h-3.5" /> B2B Trade Portal
        </span>
        <h1 className="text-3xl font-bold mt-4 tracking-tight">Wholesale Buyer Registration</h1>
        <p className="text-sm text-[#6C757D] mt-2">
          Apply for B2B access here. Wholesale pricing, RFQs, and trade credit stay hidden until
          your business account is approved.
        </p>
      </div>

      {profile?.verification === 'REJECTED' && (
        <div className="mb-6 p-5 rounded-md bg-[#EFEFEF] border border-[#C0C0C0] text-[#8B0000] flex items-start gap-4">
          <XCircle className="w-5 h-5 text-[#8B0000] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Previous Application Rejected</h4>
            <p className="text-xs text-[#8B0000] mt-1 leading-5">
              Reason: {profile.rejectionReason}
            </p>
            <p className="text-xs text-[#6C757D] mt-2 font-semibold">
              Update the details below and submit again.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between rounded-md border border-[#C0C0C0] bg-white px-4 py-3 text-xs text-[#6C757D]">
        <div>
          <p className="font-semibold uppercase tracking-wider text-[#16171a]">
            Current Application Status
          </p>
          <p className="mt-1">
            {profile?.verification || 'Not submitted yet'}
            {profile?.verification === 'REJECTED' ? ' - resubmission available' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshProfile}
          disabled={isRefreshingProfile}
          className="inline-flex items-center gap-2 rounded-md border border-[#C0C0C0] px-3 py-2 font-semibold text-[#16171a] transition-colors hover:bg-[#EFEFEF] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingProfile ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      <div className="swiss-panel p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C757D] mb-2">
              Registered Company / Business Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-[#6C757D]" />
              <input
                required
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g., Apex Retailers Ltd."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] text-sm text-[#16171a] placeholder-[#6C757D] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C757D] mb-2">
              Tax ID / GSTIN / Business License Code *
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-3.5 h-4 w-4 text-[#6C757D]" />
              <input
                required
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                placeholder="e.g., 27AAAAA1111A1Z1"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] text-sm text-[#16171a] placeholder-[#6C757D] transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C757D] mb-2">
              Corporate / Business Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-[#6C757D]" />
              <textarea
                required
                rows="3"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="Full billing and logistics address"
                className="w-full pl-12 pr-4 py-3 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] text-sm text-[#16171a] placeholder-[#6C757D] transition-colors"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md flex gap-3 text-amber-800">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs leading-5">
              <p className="font-extrabold uppercase tracking-wide">NexCart Platform Disclaimer</p>
              <p className="mt-1 text-amber-700">
                NexCart is a technology marketplace. The platform is not responsible for any
                default, fraud, or disputes in B2B credit or direct bank transfer deals.
              </p>
              <label className="flex items-center gap-2 mt-2 font-bold cursor-pointer text-[#16171a]">
                <input
                  required
                  type="checkbox"
                  className="rounded border-[#C0C0C0] text-[#0047AB]"
                />
                I acknowledge and accept this B2B risk disclaimer
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={registerB2B.isPending}
            className="w-full bg-[#0047AB] hover:bg-[#003B91] disabled:opacity-50 text-white font-semibold uppercase tracking-wider py-4 rounded-md text-xs transition-colors flex items-center justify-center gap-2"
          >
            {registerB2B.isPending
              ? 'Submitting Application...'
              : profile?.verification === 'REJECTED'
                ? 'Submit Application Again'
                : 'Submit Wholesale Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
