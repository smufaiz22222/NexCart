import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-12 pb-16 text-[#16171a] max-w-4xl mx-auto font-sans">
      {/* Header */}
      <section className="text-center space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-md bg-[#EFEFEF] border border-[#C0C0C0] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#0047AB]">
          <ShieldCheck className="h-4.5 w-4.5" />
          Security Center
        </div>
        <h1 className="text-5xl font-bold leading-none tracking-tight sm:text-6xl text-[#16171a]">
          Privacy Policy
        </h1>
        <p className="text-base leading-8 text-[#6C757D]">
          We take your data security and transaction integrity seriously. Learn how we handle your
          account and billing information.
        </p>
      </section>

      {/* Structured Legal Cards */}
      <section className="swiss-panel p-8 sm:p-10 space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#16171a]">
            1. Information We Collect
          </h2>
          <p className="text-sm leading-8 text-[#6C757D]">
            We collect basic profile information (such as your name, email address, mobile number,
            and delivery addresses) when you create an account. For guest shopping, we store your
            cart state locally in your browser storage. If you choose prepaid checkout, billing
            processing is handled securely by Razorpay, and we do not store your raw card details on
            our servers.
          </p>
        </div>

        <div className="space-y-3 border-t border-[#C0C0C0] pt-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#16171a]">
            2. How We Use Your Data
          </h2>
          <p className="text-sm leading-8 text-[#6C757D]">
            Your data is used strictly to fulfill orders, personalize product recommendations,
            secure account access, and synchronize your local shopping cart when you log in.
            Wholesalers only receive shipping details necessary to package and route your ordered
            inventory.
          </p>
        </div>

        <div className="space-y-3 border-t border-[#C0C0C0] pt-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#16171a]">
            3. Cookies and Analytics
          </h2>
          <p className="text-sm leading-8 text-[#6C757D]">
            We utilize persistent local storage for cart persistence across browser refreshes and
            session cookies for login token maintenance. Recommended items clicks and product views
            are logged solely to train and fine-tune content-based and collaborative recommendation
            systems, providing a personalized shopping experience.
          </p>
        </div>

        <div className="space-y-3 border-t border-[#C0C0C0] pt-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#16171a]">4. Your Data Rights</h2>
          <p className="text-sm leading-8 text-[#6C757D]">
            You have full control over your saved addresses and credit statements. You can update or
            delete saved addresses at any time. For full account closures or complete ledger
            clearance, you can contact our support team at support@nexcart.com.
          </p>
        </div>
      </section>
    </div>
  );
}
