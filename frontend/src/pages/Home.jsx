import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FishGrid from "@/components/FishGrid";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import InstallPWA from "@/components/InstallPWA";

const FISH_CACHE_KEY = "gsn_fish_cache";

function readFishCache() {
  try {
    const raw = localStorage.getItem(FISH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [cached] = useState(readFishCache);
  const [fish, setFish] = useState(() => (cached || []).filter((f) => f.available));
  const [status, setStatus] = useState({ is_open: true, notice: "" });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    let lastRaw = null;
    try {
      lastRaw = localStorage.getItem(FISH_CACHE_KEY);
    } catch {
      // storage unavailable — treat as no cache
    }
    async function load() {
      try {
        const [fRes, sRes, cRes] = await Promise.all([
          api.get("/fish"),
          api.get("/shop-status"),
          api.get("/settings"),
        ]);
        if (!mounted) return;
        const fishData = Array.isArray(fRes.data) ? fRes.data : [];
        const nextRaw = JSON.stringify(fishData);
        setFish(fishData.filter((f) => f.available));
        if (nextRaw !== lastRaw) {
          lastRaw = nextRaw;
          try {
            localStorage.setItem(FISH_CACHE_KEY, nextRaw);
          } catch {
            // storage unavailable/full — skip caching, still update UI
          }
        }
        setStatus(sRes.data || { is_open: true, notice: "" });
        setSettings(cRes.data || {});
      } catch (e) {
        console.error("Home load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div data-testid="home-page" className="ocean-grid-bg min-h-screen">
      <Header shopStatus={status} />
      <Hero shopStatus={status} settings={settings} />
      <FishGrid fish={fish} loading={loading} />
      <ContactSection settings={settings} />
      <Footer settings={settings} />
      <FloatingButtons settings={settings} />
      <InstallPWA />
    </div>
  );
}
