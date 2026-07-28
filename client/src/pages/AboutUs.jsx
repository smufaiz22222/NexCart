import { Sparkles, Users, Globe, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="space-y-12 pb-16 text-[#16171a] font-sans">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-md bg-[#EFEFEF] border border-[#C0C0C0] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#0047AB]">
          <Sparkles className="h-4.5 w-4.5" />
          Our Story
        </div>
        <h1 className="text-5xl font-bold leading-none tracking-tight sm:text-6xl text-[#16171a]">
          Who We Are
        </h1>
        <p className="text-base leading-8 text-[#6C757D]">
          NexCart is a dynamic B2B and retail marketplace designed to bridge the gap between quality
          wholesalers and professional buyers. We build transparent, structured, and accessible
          commerce solutions.
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="swiss-panel p-8 sm:p-10 space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-[#16171a]">Our Mission & Vision</h2>
          <p className="text-sm leading-8 text-[#6C757D]">
            At NexCart, we believe fashion and quality goods should be accessible without
            unnecessary middle layers. Our platform empowers local wholesalers to present their
            collections directly to retail buyers, integrating content-based recommendations, live
            catalog tracking, and digitizing tools.
          </p>
          <p className="text-sm leading-8 text-[#6C757D]">
            By matching buyers with verified wholesale suppliers, we create an ecosystem of
            credibility, high margins for retailers, and fresh discoveries for consumers. We are
            building the infrastructure for the next generation of supply-chain commerce.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 pt-4">
            <div className="swiss-card p-5 space-y-3">
              <div className="rounded-md bg-[#EFEFEF] border border-[#C0C0C0] p-2.5 text-[#0047AB] w-fit">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[#16171a]">Community First</h3>
              <p className="text-xs leading-5 text-[#6C757D]">
                Supporting independent suppliers and connecting them with a highly active customer
                base.
              </p>
            </div>

            <div className="swiss-card p-5 space-y-3">
              <div className="rounded-md bg-[#EFEFEF] border border-[#C0C0C0] p-2.5 text-[#0047AB] w-fit">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[#16171a]">Seamless Reach</h3>
              <p className="text-xs leading-5 text-[#6C757D]">
                Breaking geographic bounds so suppliers can distribute inventory seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* Sidebar Values Card */}
        <aside className="rounded-md bg-[#16171a] p-8 sm:p-10 text-white shadow-md flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C0C0C0]">Core Values</p>
            <h2 className="text-4xl font-bold tracking-tight leading-tight text-white">
              Driven by Quality & Integrity.
            </h2>
            <p className="text-sm leading-7 text-[#C0C0C0]">
              We curate our wholesaler directory to guarantee quality products, verified ratings,
              and prompt fulfillment.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-[#C0C0C0]/20 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#C0C0C0]" />
              <span className="text-sm font-semibold">Verified Suppliers Only</span>
            </div>
            <p className="text-xs text-[#C0C0C0] pl-8">
              Every seller on our platform undergoes a robust background and catalog check.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
