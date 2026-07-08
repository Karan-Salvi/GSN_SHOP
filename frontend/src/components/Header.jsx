import { Fish } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatMarathiDate(d) {
  return d.toLocaleDateString("mr-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

export default function Header({ shopStatus }) {
  const now = useLiveClock();
  const isOpen = shopStatus?.is_open;

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
        <Link to="/" data-testid="brand-link" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-ocean-500 flex items-center justify-center text-white shadow-lg shadow-ocean-500/25 transition-transform duration-300 group-hover:-rotate-6">
            <Fish className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg sm:text-xl font-extrabold text-ocean-600">GSN Fresh Fish</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Service · सेवा</div>
          </div>
        </Link>

        <div className="hidden md:flex flex-col items-end text-xs text-slate-600 leading-tight">
          <span data-testid="header-date" className="mr--text">{formatMarathiDate(now)}</span>
          <span data-testid="header-time" className="font-num text-ocean-600 text-sm">{formatTime(now)}</span>
        </div>

        <div className="flex items-center gap-3">
          <span
            data-testid="shop-status-badge"
            className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-sm ${
              isOpen ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full bg-white/90 ${isOpen ? "animate-ping-soft" : ""}`}
            />
            {isOpen ? "OPEN · सुरू" : "CLOSED · बंद"}
          </span>
          <Link
            to="/admin"
            data-testid="header-admin-link"
            className="hidden sm:inline-flex text-xs font-semibold text-ocean-600 hover:text-ocean-700 px-3 py-1.5 rounded-full border border-ocean-200 hover:border-ocean-400 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
