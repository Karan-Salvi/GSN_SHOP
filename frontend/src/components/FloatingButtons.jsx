import { MessageCircle, Phone, MapPin } from "lucide-react";

function waLink(number) {
  const digits = (number || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}

export default function FloatingButtons({ settings }) {
  const s = settings || {};
  return (
    <div data-testid="floating-buttons" className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-50 flex flex-col gap-3">
      {s.whatsapp && (
        <a
          href={waLink(s.whatsapp)}
          target="_blank"
          rel="noreferrer"
          data-testid="fab-whatsapp"
          aria-label="Chat on WhatsApp"
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-ping-soft transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
      {s.mobile && (
        <a
          href={`tel:${s.mobile.replace(/\s/g, "")}`}
          data-testid="fab-call"
          aria-label="Call the shop"
          className="w-14 h-14 rounded-full bg-ocean-500 hover:bg-ocean-600 text-white flex items-center justify-center shadow-xl shadow-ocean-500/30 transition-colors"
        >
          <Phone className="w-6 h-6" />
        </a>
      )}
      {s.google_maps_url && (
        <a
          href={s.google_maps_url}
          target="_blank"
          rel="noreferrer"
          data-testid="fab-maps"
          aria-label="Open in Google Maps"
          className="w-14 h-14 rounded-full bg-aqua hover:bg-aqua/90 text-white flex items-center justify-center shadow-xl shadow-aqua/30 transition-colors"
        >
          <MapPin className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}
