import FishCard from "./FishCard";
import { Fish as FishIcon } from "lucide-react";

export default function FishGrid({ fish, loading }) {
  return (
    <section
      id="fish"
      data-testid="fish-section"
      className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 text-aqua text-xs font-bold uppercase tracking-[0.2em]">
            <FishIcon className="w-4 h-4" /> आजची पकड · Today&apos;s Catch
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ocean-600">
            <span className="mr-text">उपलब्ध मासे</span>
            <span className="text-slate-800"> · Available Fish</span>
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl">
            प्रत्येक मासा ताज्या पकडलेल्या साठ्यातून. दर दररोज बाजारभावानुसार
            अपडेट होतो.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {loading ? "Loading..." : `${fish.length} items`}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : fish.length === 0 ? (
        <div
          data-testid="empty-fish-state"
          className="rounded-2xl border border-dashed border-slate-300 py-20 text-center text-slate-500"
        >
          अजून मासे जोडलेले नाहीत. कृपया नंतर पुन्हा भेट द्या.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {fish.map((f, i) => (
            <FishCard key={f.id} fish={f} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
