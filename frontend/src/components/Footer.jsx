import { Fish, Facebook, Instagram, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer({ settings }) {
  const s = settings || {};
  const year = new Date().getFullYear();
  return (
    <footer data-testid="site-footer" className="mt-16 bg-ocean-600 text-white/85">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Fish className="w-6 h-6 text-aqua" />
              </div>
              <div className="leading-tight">
                <div className="font-display text-xl font-extrabold text-white">GSN Fresh Fish Service</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">ताजे मासे · दररोज</div>
              </div>
            </div>
            <p className="mt-5 text-sm text-white/70 max-w-md">
              Trusted neighbourhood fish market bringing the freshest catch from Maharashtra&apos;s coast every morning.
              किंमत, उपलब्धता आणि खात्रीशीर गुणवत्ता.
            </p>
          </div>

          <div>
            <h4 className="font-display text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#fish" className="hover:text-white transition-colors" data-testid="footer-link-fish">Today&apos;s Fish</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors" data-testid="footer-link-contact">Contact</a></li>
              <li><Link to="/admin" className="hover:text-white transition-colors" data-testid="footer-link-admin">Admin Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white font-bold mb-4">Connect</h4>
            <div className="space-y-2 text-sm">
              {s.mobile && (
                <a href={`tel:${s.mobile.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" /> {s.mobile}
                </a>
              )}
              {s.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{s.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3 pt-3">
                {s.facebook_url ? (
                  <a href={s.facebook_url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" data-testid="footer-fb">
                    <Facebook className="w-4 h-4" />
                  </a>
                ) : null}
                {s.instagram_url ? (
                  <a href={s.instagram_url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" data-testid="footer-ig">
                    <Instagram className="w-4 h-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <div>© {year} GSN Fresh Fish Service. All rights reserved.</div>
          <div>Made with love for the coast · कोकणासाठी</div>
        </div>
      </div>
    </footer>
  );
}
