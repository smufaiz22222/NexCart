import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  HelpCircle,
  Hourglass,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useB2BRegister, useMyLedger } from '../api/queries';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function B2BOnboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const registerB2B = useB2BRegister();

  // If the user's business profile status updates, they should be able to see it.
  // We can also fetch ledger data which returns the business profile inside req.user if refreshed,
  // or we can read from the ledger statement itself which is fetched securely.
  const { data: ledgerData, refetch: refetchLedger } = useMyLedger();

  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    businessAddress: '',
  });

  // Current status trackers
  const [profile, setProfile] = useState(null);

  // Sync profile state from server if user already applied
  useEffect(() => {
    if (ledgerData?.entries) {
      // Fetching the user profile from queries
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/auth/profile', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setProfile(data.user?.businessProfile || null);
            // Sync user state in authStore
            setUser(data.user);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchProfile();
    }
  }, [ledgerData, setUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    registerB2B.mutate(formData, {
      onSuccess: (res) => {
        toast.success('Onboarding application submitted successfully!');
        setProfile(res.profile);
        // Refresh local session
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#161412]">
        <div className="bg-emerald-50 border border-emerald-100 rounded-[30px] p-8 shadow-sm">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/10">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Wholesale Access Unlocked!</h1>
          <p className="text-sm text-[#6b665f] mt-3 leading-6">
            Congratulations! Your business profile for <span className="font-extrabold text-[#161412]">{profile.companyName}</span> has been verified and approved.
          </p>
          <div className="mt-6 p-5 rounded-2xl bg-white border border-[#ddd7cc] text-left">
            <p className="text-xs font-black uppercase tracking-wider text-[#8f877b]">Wholesaler Trade Credit</p>
            <p className="text-sm text-[#161412] font-semibold mt-2 leading-relaxed">
              Once your business profile is approved, participating wholesalers may independently offer trade credit based on your relationship, purchasing history and business verification.
            </p>
          </div>
          <button
            onClick={() => navigate('/store/dashboard')}
            className="mt-8 w-full bg-[#161412] hover:bg-[#34302b] text-white py-3.5 px-6 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all"
          >
            Go to Business Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. RENDER PENDING STATUS (UNDER REVIEW)
  if (profile?.verification === 'APPLIED') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans text-[#161412]">
        <div className="bg-white border border-[#ddd7cc] rounded-[30px] p-8 shadow-[0_10px_35px_rgba(0,0,0,0.01)]">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Hourglass className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Application Under Audit</h1>
          <p className="text-sm text-[#6b665f] mt-3 leading-6">
            Your wholesale profile for <span className="font-bold text-[#161412]">{profile.companyName}</span> is currently pending tax & credentials review.
          </p>
          <div className="mt-6 border-t border-[#f3efe8] pt-6 text-left space-y-3">
            <div className="flex items-center gap-3 text-xs text-[#6b665f]">
              <Building2 className="w-4 h-4 text-[#8f877b]" />
              <div><span className="font-bold text-[#161412]">Tax ID / GSTIN:</span> {profile.taxId}</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#6b665f]">
              <MapPin className="w-4 h-4 text-[#8f877b]" />
              <div><span className="font-bold text-[#161412]">Business Location:</span> {profile.businessAddress}</div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-[#f8f6f1] border border-[#ddd7cc] text-xs text-[#8f877b] leading-5">
            Verification checks usually complete in 1-2 business days. Until approved, you can continue to place standard retail orders (B2C) on the storefront.
          </div>
          <button
            onClick={() => navigate('/store')}
            className="mt-8 w-full bg-[#161412] hover:bg-[#34302b] text-white py-3.5 px-6 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all"
          >
            Continue Shopping (Retail)
          </button>
        </div>
      </div>
    );
  }

  // 3. RENDER REJECTED STATUS / DEFAULT ONBOARDING FORM
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans text-[#161412]">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1 bg-[#161412]/5 text-[#161412]/80 border border-[#161412]/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
          <Briefcase className="w-3.5 h-3.5" /> B2B Trade Portal
        </span>
        <h1 className="text-3xl font-black mt-4 tracking-tight">Wholesale Buyer Registration</h1>
        <p className="text-sm text-[#6b665f] mt-2">
          Unlock tier discount tables, bulk purchase rates, quote negotiations, and credit accounts.
        </p>
      </div>

      {profile?.verification === 'REJECTED' && (
        <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 flex items-start gap-4">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Previous Application Rejected</h4>
            <p className="text-xs text-rose-600 mt-1 leading-5">
              Reason: {profile.rejectionReason}
            </p>
            <p className="text-xs text-rose-500 mt-2 font-medium">Please review your credentials and submit a new request below.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#ddd7cc] rounded-[28px] p-8 shadow-[0_12px_45px_rgba(0,0,0,0.015)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#8f877b] mb-2">
              Registered Company / Business Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-[#8f877b]" />
              <input
                required
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g., Apex Retailers Ltd."
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f6f1]/50 border border-[#ddd7cc] rounded-2xl focus:outline-none focus:border-[#161412] focus:ring-1 focus:ring-[#161412] text-sm text-[#161412] placeholder-[#8f877b] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#8f877b] mb-2">
              Tax ID / GSTIN / Business License Code *
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-3.5 h-4 w-4 text-[#8f877b]" />
              <input
                required
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                placeholder="e.g., 27AAAAA1111A1Z1"
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f6f1]/50 border border-[#ddd7cc] rounded-2xl focus:outline-none focus:border-[#161412] focus:ring-1 focus:ring-[#161412] text-sm text-[#161412] placeholder-[#8f877b] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#8f877b] mb-2">
              Corporate / Business Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-[#8f877b]" />
              <textarea
                required
                rows="3"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="Full billing and logistics address"
                className="w-full pl-12 pr-4 py-3 bg-[#f8f6f1]/50 border border-[#ddd7cc] rounded-2xl focus:outline-none focus:border-[#161412] focus:ring-1 focus:ring-[#161412] text-sm text-[#161412] placeholder-[#8f877b] transition-all"
              />
            </div>
          </div>

          <div className="p-4 bg-[#f8f6f1] border border-[#ddd7cc] rounded-2xl flex gap-3">
            <ShieldCheck className="w-5 h-5 text-[#6b665f] shrink-0" />
            <p className="text-xs text-[#8f877b] leading-5">
              By submitting this onboarding request, you verify that you are an authorized representative of the stated business entity. 
            </p>
          </div>

          <button
            type="submit"
            disabled={registerB2B.isPending}
            className="w-full bg-[#161412] hover:bg-[#34302b] disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-4 rounded-full text-xs transition-all flex items-center justify-center gap-2"
          >
            {registerB2B.isPending ? 'Uploading Documents...' : 'Submit Wholesale Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
