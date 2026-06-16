import { useState } from 'react';
import { Mail, Phone, MapPin, Send, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      toast.success('Your message has been sent! We will get back to you shortly.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-12 pb-16 text-[#161412]">
      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#161412]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
          <HelpCircle className="h-4.5 w-4.5" />
          Get in touch
        </div>
        <h1 className="text-5xl font-black leading-none tracking-tight sm:text-6xl">Contact Us</h1>
        <p className="text-base leading-8 text-[#6b665f]">
          Have an inquiry, feedback, or custom support issue? Message us directly and we will
          respond within 24 hours.
        </p>
      </section>

      {/* Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Contact Form */}
        <section className="rounded-[36px] bg-white p-8 sm:p-10 shadow-[0_18px_45px_rgba(22,20,18,0.04)]">
          <h2 className="text-2xl font-black tracking-tight mb-6">Send Message</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                  Full Name
                </span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="mt-2 w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3.5 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                  Email Address
                </span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="mt-2 w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3.5 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                Subject
              </span>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="How can we help you?"
                className="mt-2 w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3.5 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                Message
              </span>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your message details..."
                className="mt-2 w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412] resize-none"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#161412] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#2c2926] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
              {!isSubmitting && <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>

        {/* Sidebar Info */}
        <aside className="rounded-[36px] bg-[#161412] p-8 sm:p-10 text-white shadow-[0_22px_60px_rgba(22,20,18,0.14)] flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8d1c5]">
              Contact info
            </p>
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              We are Here to Support Your Growth.
            </h2>
            <p className="text-sm leading-7 text-[#c8c1b4]">
              For immediate billing or tenant onboarding assistance, reach out directly.
            </p>
          </div>

          <div className="mt-8 space-y-6 pt-8 border-t border-white/10">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white/10 p-2.5">
                <Mail className="h-5 w-5 text-[#d8d1c5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8d1c5]">
                  Email
                </p>
                <p className="text-sm mt-1">support@shop.co</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white/10 p-2.5">
                <Phone className="h-5 w-5 text-[#d8d1c5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8d1c5]">
                  Phone
                </p>
                <p className="text-sm mt-1">+91 98765 43210</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white/10 p-2.5">
                <MapPin className="h-5 w-5 text-[#d8d1c5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8d1c5]">
                  Address
                </p>
                <p className="text-sm mt-1 leading-6 text-[#c8c1b4]">
                  Shop.co HQ, Corporate Plaza, Sector 62, Noida, UP, India
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
