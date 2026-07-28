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
    <div className="space-y-12 pb-16 text-[#16171a] font-sans">
      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-md bg-[#EFEFEF] border border-[#C0C0C0] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#0047AB]">
          <HelpCircle className="h-4.5 w-4.5" />
          Get in Touch
        </div>
        <h1 className="text-5xl font-bold leading-none tracking-tight sm:text-6xl text-[#16171a]">
          Contact Us
        </h1>
        <p className="text-base leading-8 text-[#6C757D]">
          Have an inquiry, feedback, or custom support issue? Message us directly and we will
          respond within 24 hours.
        </p>
      </section>

      {/* Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Contact Form */}
        <section className="swiss-panel p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#16171a] mb-6">Send Message</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6C757D]">
                  Full Name
                </span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="mt-2 w-full rounded-md border border-[#C0C0C0] bg-white px-4 py-3.5 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6C757D]">
                  Email Address
                </span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="mt-2 w-full rounded-md border border-[#C0C0C0] bg-white px-4 py-3.5 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] transition-colors"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6C757D]">
                Subject
              </span>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="How can we help you?"
                className="mt-2 w-full rounded-md border border-[#C0C0C0] bg-white px-4 py-3.5 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6C757D]">
                Message
              </span>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your message details..."
                className="mt-2 w-full rounded-md border border-[#C0C0C0] bg-white px-4 py-4 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB] focus:border-[#0047AB] transition-colors resize-none"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#0047AB] hover:bg-[#003B91] px-6 py-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
              {!isSubmitting && <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>

        {/* Sidebar Info */}
        <aside className="rounded-md bg-[#16171a] p-8 sm:p-10 text-white shadow-md flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C0C0C0]">
              Contact Info
            </p>
            <h2 className="text-3xl font-bold tracking-tight leading-tight text-white">
              We are Here to Support Your Growth.
            </h2>
            <p className="text-sm leading-7 text-[#C0C0C0]">
              For immediate billing or tenant onboarding assistance, reach out directly.
            </p>
          </div>

          <div className="mt-8 space-y-6 pt-8 border-t border-[#C0C0C0]/20">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-white/5 p-2.5 border border-[#C0C0C0]/10">
                <Mail className="h-5 w-5 text-[#C0C0C0]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C0C0C0]">Email</p>
                <p className="text-sm mt-1 font-mono">support@nexcart.com</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-md bg-white/5 p-2.5 border border-[#C0C0C0]/10">
                <Phone className="h-5 w-5 text-[#C0C0C0]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C0C0C0]">Phone</p>
                <p className="text-sm mt-1 font-mono">+91 98765 43210</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-md bg-white/5 p-2.5 border border-[#C0C0C0]/10">
                <MapPin className="h-5 w-5 text-[#C0C0C0]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C0C0C0]">Address</p>
                <p className="text-sm mt-1 leading-6 text-[#C0C0C0]">
                  NexCart HQ, Corporate Plaza, Sector 62, Noida, UP, India
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
