import { AlertTriangle, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusCopy = {
  APPLIED: {
    title: 'Application submitted',
    description:
      'Your wholesaler application is waiting for admin review. Billing and trial are still available from this account.',
  },
  UNDER_REVIEW: {
    title: 'Application under review',
    description:
      'Your seller profile is being reviewed. You can still manage billing and trial access while the team checks your details.',
  },
  REJECTED: {
    title: 'Application needs changes',
    description:
      'Your wholesaler profile was rejected. Review the reason below, update your details with support, and retry once fixed.',
  },
  SUSPENDED: {
    title: 'Seller access suspended',
    description:
      'Operational seller tools are paused for this account. Billing details remain visible so the account can be recovered.',
  },
  APPROVED: {
    title: 'Approved, plan not active',
    description:
      'Your seller profile is approved. Start a trial or activate a paid plan to unlock premium tools.',
  },
  PAST_DUE: {
    title: 'Subscription needs renewal',
    description:
      'Premium tools are paused because the current plan is past due. Renew from billing to restore access.',
  },
};

export function OperationalAccessNotice({ status, rejectionReason }) {
  const copy = statusCopy[status] || {
    title: 'Seller access limited',
    description: 'This seller account cannot use operational tools right now.',
  };

  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_34%),linear-gradient(135deg,_#171717,_#0b0b0b)] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300/80">
            Seller Access
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight">{copy.title}</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">{copy.description}</p>
          {rejectionReason ? (
            <div className="mt-4 rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <span className="font-bold">Reason:</span> {rejectionReason}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/wholesaler/billing"
              className="inline-flex items-center rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-amber-300"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Open Billing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PremiumFeatureNotice({ featureName }) {
  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-sky-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(135deg,_#171717,_#0b0b0b)] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-300">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-300/80">
            Premium Feature
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight">{featureName} is locked</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            This screen needs an active plan that includes the feature. Start a trial or switch to a
            paid plan from billing.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/wholesaler/billing"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-zinc-100"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade or renew
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SellerInlineState({ status }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-[#111111] p-4 text-sm text-zinc-300">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span>
          Seller status: <strong className="text-white">{status || 'UNKNOWN'}</strong>
        </span>
      </div>
    </div>
  );
}
