import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  Hourglass,
  MapPin,
  RefreshCw,
  ShieldCheck,
  XCircle,
  ArrowRight,
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
    return <B2BOnboardingApprovedView profile={profile} navigate={navigate} />;
  }

  // 2. RENDER PENDING STATUS (UNDER REVIEW)
  if (profile?.verification === 'APPLIED') {
    return <B2BOnboardingPendingView profile={profile} navigate={navigate} />;
  }

  // 3. RENDER REJECTED STATUS / DEFAULT ONBOARDING FORM
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans text-[#1e293b]">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/store/dashboard')}
          className="flex items-center text-sm font-semibold text-[#64748b] hover:text-[#7c3aed] transition-colors group mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] uppercase tracking-wider mb-4">
            <Briefcase className="w-3.5 h-3.5" /> B2B Trade Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">
            Wholesale Buyer Registration
          </h1>
          <p className="text-sm text-[#64748b] mt-2 max-w-md mx-auto">
            Apply for B2B access to unlock wholesale pricing, RFQs, and trade credit from
            participating wholesalers.
          </p>
        </div>
      </div>

      {profile?.verification === 'REJECTED' && (
        <div className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-red-700">Previous Application Rejected</h4>
            <p className="text-xs text-red-600 mt-1 leading-5">Reason: {profile.rejectionReason}</p>
            <p className="text-xs text-[#64748b] mt-2 font-semibold">
              Update the details below and submit again.
            </p>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
            Application Status
          </p>
          <p className="text-sm font-bold text-[#1e293b] mt-0.5">
            {profile?.verification === 'REJECTED'
              ? 'Rejected - resubmission available'
              : 'Not submitted yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshProfile}
          disabled={isRefreshingProfile}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-xs font-bold text-[#1e293b] transition-all hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingProfile ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm animate-slide-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="b2b-onboarding-company-name"
              className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2.5"
            >
              Registered Company / Business Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-[#94a3b8]" />
              <input
                id="b2b-onboarding-company-name"
                required
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g., Apex Retailers Ltd."
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] text-sm text-[#1e293b] placeholder-[#94a3b8] transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="b2b-onboarding-tax-id"
              className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2.5"
            >
              Tax ID / GSTIN / Business License Code *
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-3.5 h-4 w-4 text-[#94a3b8]" />
              <input
                id="b2b-onboarding-tax-id"
                required
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                placeholder="e.g., 27AAAAA1111A1Z1"
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] text-sm text-[#1e293b] placeholder-[#94a3b8] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="b2b-onboarding-business-address"
              className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2.5"
            >
              Corporate / Business Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-[#94a3b8]" />
              <textarea
                id="b2b-onboarding-business-address"
                required
                rows="3"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="Full billing and logistics address"
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] text-sm text-[#1e293b] placeholder-[#94a3b8] transition-all resize-none"
              />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-xs leading-5 text-amber-800">
              <p className="font-bold uppercase tracking-wide text-amber-900">
                Platform Disclaimer
              </p>
              <p className="mt-1">
                NexCart is a technology marketplace. The platform is not responsible for any
                default, fraud, or disputes in B2B credit or direct bank transfer deals.
              </p>
              <label className="flex items-center gap-2 mt-3 font-bold cursor-pointer text-[#1e293b]">
                <input
                  required
                  type="checkbox"
                  className="rounded border-[#e2e8f0] text-[#7c3aed] focus:ring-[#7c3aed]"
                />
                I acknowledge and accept this B2B risk disclaimer
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={registerB2B.isPending}
            className="w-full bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:from-[#6d28d9] hover:to-[#4338ca] disabled:opacity-50 text-white font-bold uppercase tracking-wider py-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 btn-press"
          >
            {registerB2B.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting Application...
              </>
            ) : profile?.verification === 'REJECTED' ? (
              'Resubmit Application'
            ) : (
              'Submit Wholesale Application'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function B2BOnboardingApprovedView({ profile, navigate }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#1e293b]">
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 shadow-sm animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">
          Business Account Approved
        </h1>
        <p className="text-sm text-[#64748b] mt-3 leading-6">
          Your business profile for{' '}
          <span className="font-bold text-[#1e293b]">{profile.companyName}</span> has been verified
          and approved. Your B2B portal is now available.
        </p>

        <div className="mt-6 border-t border-[#e2e8f0] pt-6 text-left space-y-3">
          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#64748b]" />
            </div>
            <div>
              <span className="font-bold text-[#1e293b]">Tax ID / GSTIN:</span>{' '}
              <span className="font-mono">{profile.taxId}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#64748b]" />
            </div>
            <div>
              <span className="font-bold text-[#1e293b]">Business Location:</span>{' '}
              {profile.businessAddress}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/store/dashboard/b2b')}
          className="mt-8 w-full bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:from-[#6d28d9] hover:to-[#4338ca] text-white py-3.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
        >
          Open B2B Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function B2BOnboardingPendingView({ profile, navigate }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#1e293b]">
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 shadow-sm animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6">
          <Hourglass className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">
          Application Under Review
        </h1>
        <p className="text-sm text-[#64748b] mt-3 leading-6">
          Your wholesale profile for{' '}
          <span className="font-bold text-[#1e293b]">{profile.companyName}</span> is currently
          pending tax and credentials review.
        </p>

        <div className="mt-6 border-t border-[#e2e8f0] pt-6 text-left space-y-3">
          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#64748b]" />
            </div>
            <div>
              <span className="font-bold text-[#1e293b]">Tax ID / GSTIN:</span>{' '}
              <span className="font-mono">{profile.taxId}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#64748b]" />
            </div>
            <div>
              <span className="font-bold text-[#1e293b]">Business Location:</span>{' '}
              {profile.businessAddress}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#64748b] leading-5">
          Verification checks usually complete in 1-2 business days. Until approved, you can
          continue to place standard retail orders on the storefront.
        </div>

        <button
          type="button"
          onClick={() => navigate('/store')}
          className="mt-8 w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white py-3.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
        >
          Continue Retail Shopping
        </button>
      </div>
    </div>
  );
}
