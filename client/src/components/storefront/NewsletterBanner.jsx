import { Sparkles } from 'lucide-react';

export default function NewsletterBanner() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Newsletter subscription mock logic or tracking
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-6 py-10 text-white sm:px-10">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-lg">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#e0e7ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Newsletter
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight">
              Get exclusive deals straight to your inbox
            </h2>
            <p className="mt-2 text-sm text-[#c7d2fe]">
              Subscribe for weekly offers, new arrivals, and category-specific recommendations.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              required
              className="w-full rounded-full bg-white px-5 py-3.5 text-sm text-[#1e293b] outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[#f97316] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#ea580c]"
            >
              Subscribe
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
