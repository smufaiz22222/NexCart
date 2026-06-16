import { Sparkles, Users, Globe, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="space-y-12 pb-16 text-[#161412]">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#161412]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
          <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          Our Story
        </div>
        <h1 className="text-5xl font-black leading-none tracking-tight sm:text-6xl">Who We Are</h1>
        <p className="text-base leading-8 text-[#6b665f]">
          SHOP.CO is a dynamic marketplace designed to bridge the gap between quality wholesalers
          and trend-conscious buyers. We build transparent, accessible commerce solutions.
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] bg-white p-8 sm:p-10 shadow-[0_18px_45px_rgba(22,20,18,0.04)] space-y-6">
          <h2 className="text-3xl font-black tracking-tight">Our Mission & Vision</h2>
          <p className="text-sm leading-8 text-[#5f5951]">
            At SHOP.CO, we believe fashion and quality goods should be accessible without
            unnecessary middle layers. Our platform empowers local wholesalers to present their
            collections directly to retail buyers, integrating content-based recommendations, live
            catalog tracking, and digitizing tools.
          </p>
          <p className="text-sm leading-8 text-[#5f5951]">
            By matching buyers with verified wholesale suppliers, we create an ecosystem of
            credibility, high margins for retailers, and fresh discoveries for consumers. We are
            building the infrastructure for the next generation of supply-chain commerce.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 pt-4">
            <div className="rounded-[24px] bg-[#fbfaf7] border border-[#ece7de] p-5 space-y-3">
              <div className="rounded-xl bg-[#161412] p-2.5 text-white w-fit">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Community First</h3>
              <p className="text-xs leading-5 text-[#6b665f]">
                Supporting independent suppliers and connecting them with a highly active customer
                base.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#fbfaf7] border border-[#ece7de] p-5 space-y-3">
              <div className="rounded-xl bg-[#161412] p-2.5 text-white w-fit">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Seamless Reach</h3>
              <p className="text-xs leading-5 text-[#6b665f]">
                Breaking geographic bounds so suppliers can distribute inventory seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* Sidebar Values Card */}
        <aside className="rounded-[36px] bg-[#161412] p-8 sm:p-10 text-white shadow-[0_22px_60px_rgba(22,20,18,0.14)] flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8d1c5]">
              Core values
            </p>
            <h2 className="text-4xl font-black tracking-tight leading-tight">
              Driven by Quality & Integrity.
            </h2>
            <p className="text-sm leading-7 text-[#c8c1b4]">
              We curate our wholesaler directory to guarantee quality products, verified ratings,
              and prompt fulfillment.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#d8d1c5]" />
              <span className="text-sm font-semibold">Verified Suppliers Only</span>
            </div>
            <p className="text-xs text-[#c8c1b4] pl-8">
              Every seller on our platform undergoes a robust background and catalog check.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
