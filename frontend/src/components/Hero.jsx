import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const HERO_BG = "https://images.pexels.com/photos/3903587/pexels-photo-3903587.jpeg";

export default function Hero({ shopStatus }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("mr-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden rounded-b-[2.5rem]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${HERO_BG})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 hero-overlay" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24 lg:py-32">
        <div className="max-w-3xl animate-fade-up">
          {shopStatus?.notice ? (
            <div
              data-testid="hero-notice"
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{shopStatus.notice}</span>
            </div>
          ) : null}

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] text-balance">
            <span className="block mr-text">ताजे मासे, थेट समुद्रातून</span>
            <span className="block text-aqua mt-2">Fresh Fish, Straight from the Coast</span>
          </h1>

          <p className="mt-6 text-white/85 text-base sm:text-lg max-w-2xl leading-relaxed">
            <span className="mr-text">आजचे उपलब्ध मासे पहा, किंमत तपासा आणि थेट संपर्क करा.</span>{" "}
            <span className="block sm:inline mt-2 sm:mt-0">
              See today&apos;s catch, live prices, and reach the shop instantly on WhatsApp.
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#fish"
              data-testid="hero-view-fish-btn"
              className="inline-flex items-center gap-2 bg-aqua hover:bg-aqua/90 text-white font-semibold px-6 py-3 rounded-full shadow-lg shadow-aqua/25 transition-colors"
            >
              आजचे मासे पहा · View Today&apos;s Catch
            </a>
            <a
              href="#contact"
              data-testid="hero-contact-btn"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              संपर्क · Contact
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-white/85 text-sm">
            <div>
              <span className="uppercase tracking-widest text-[11px] text-white/60">आजची तारीख</span>
              <div data-testid="hero-date" className="mr-text">{dateStr}</div>
            </div>
            <div>
              <span className="uppercase tracking-widest text-[11px] text-white/60">Time</span>
              <div data-testid="hero-time" className="font-num text-lg">{timeStr}</div>
            </div>
            <div>
              <span className="uppercase tracking-widest text-[11px] text-white/60">Status</span>
              <div className={`font-semibold ${shopStatus?.is_open ? "text-emerald-300" : "text-red-300"}`}>
                {shopStatus?.is_open ? "Open · सुरू आहे" : "Closed · बंद आहे"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
