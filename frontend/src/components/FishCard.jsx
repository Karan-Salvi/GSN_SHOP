import { Fish as FishIcon, Sparkles } from "lucide-react";

const FALLBACK_IMG = "https://images.pexels.com/photos/19993434/pexels-photo-19993434.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function FishCard({ fish, index = 0 }) {
  const img = fish.image_base64
    ? (fish.image_base64.startsWith("data:") ? fish.image_base64 : `data:image/jpeg;base64,${fish.image_base64}`)
    : FALLBACK_IMG;

  return (
    <article
      data-testid={`fish-card-${fish.id}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className="fish-card-shadow group relative overflow-hidden rounded-2xl bg-white border border-slate-100 hover:border-aqua/50 animate-fade-up"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={img}
          alt={fish.name_en}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {fish.is_special && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-bold uppercase tracking-wider shadow">
            <Sparkles className="w-3 h-3" /> Special
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span
            data-testid={`fish-avail-${fish.id}`}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              fish.available ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {fish.available ? "Available" : "Out of Stock"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="mr-text text-xl font-extrabold text-ocean-600">{fish.name_mr}</h3>
            <p className="text-sm text-slate-600 font-medium">{fish.name_en}</p>
          </div>
          <FishIcon className="w-5 h-5 text-aqua shrink-0 mt-1" />
        </div>
        {fish.description ? (
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">{fish.description}</p>
        ) : null}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Price · दर</div>
            <div className="font-num text-2xl font-bold text-slate-900 leading-none">
              ₹<span data-testid={`fish-price-${fish.id}`}>{Math.round(fish.price_per_kg)}</span>
              <span className="text-sm text-slate-500 font-medium">/kg</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
