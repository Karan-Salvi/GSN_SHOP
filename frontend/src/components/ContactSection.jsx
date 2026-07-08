import { Phone, MessageCircle, MapPin, Clock, User } from "lucide-react";

function waLink(number) {
  const digits = (number || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}

export default function ContactSection({ settings }) {
  const s = settings || {};
  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24"
    >
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
        <div>
          <div className="inline-flex items-center gap-2 text-aqua text-xs font-bold uppercase tracking-[0.2em]">
            <MapPin className="w-4 h-4" /> Contact · संपर्क
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ocean-600">
            <span className="mr-text">आमच्याशी संपर्क साधा</span>
            <span className="block text-slate-800">Reach the Shop</span>
          </h2>
          <p className="mt-3 text-slate-600 max-w-lg">
            ऑर्डर देण्यासाठी थेट कॉल किंवा व्हॉट्सअॅप करा. आपला मासा राखीव ठेवला जाईल.
          </p>

          <div className="mt-8 space-y-4">
            <InfoRow icon={User} label="Owner · मालक" value={s.owner_name} testId="contact-owner" />
            <InfoRow icon={Phone} label="Mobile · मोबाईल" value={s.mobile} testId="contact-mobile" />
            <InfoRow icon={MessageCircle} label="WhatsApp" value={s.whatsapp} testId="contact-whatsapp" />
            <InfoRow icon={MapPin} label="Address · पत्ता" value={s.address} testId="contact-address" />
            <InfoRow icon={Clock} label="Business Hours · वेळ" value={s.business_hours} testId="contact-hours" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {s.mobile && (
              <a
                href={`tel:${s.mobile.replace(/\s/g, "")}`}
                data-testid="contact-call-btn"
                className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white font-semibold px-5 py-3 rounded-full transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
            )}
            {s.whatsapp && (
              <a
                href={waLink(s.whatsapp)}
                target="_blank"
                rel="noreferrer"
                data-testid="contact-whatsapp-btn"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-full transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {s.google_maps_url && (
              <a
                href={s.google_maps_url}
                target="_blank"
                rel="noreferrer"
                data-testid="contact-maps-btn"
                className="inline-flex items-center gap-2 bg-aqua hover:bg-aqua/90 text-white font-semibold px-5 py-3 rounded-full transition-colors"
              >
                <MapPin className="w-4 h-4" /> Google Maps
              </a>
            )}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg shadow-ocean-500/5 min-h-[380px]">
          <iframe
            title="Shop Location"
            data-testid="contact-map-iframe"
            src={s.google_maps_embed || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.71637099863283!3d19.08251820777361!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sMumbai%20fish%20market!5e0!3m2!1sen!2sin!4v1700000000000"}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 380 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value, testId }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 rounded-xl bg-white border border-slate-100 p-4 hover:border-aqua/40 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-ocean-50 text-ocean-500 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
        <div data-testid={testId} className="text-slate-800 font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}
