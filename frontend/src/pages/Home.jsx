import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FishGrid from "@/components/FishGrid";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import InstallPWA from "@/components/InstallPWA";

export default function Home() {
  const [fish, setFish] = useState([]);
  const [status, setStatus] = useState({ is_open: true, notice: "" });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [fRes, sRes, cRes] = await Promise.all([
          api.get("/fish"),
          api.get("/shop-status"),
          api.get("/settings"),
        ]);
        if (!mounted) return;
        setFish(fRes.data || []);
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
