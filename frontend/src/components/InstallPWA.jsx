import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

/** Detect iOS Safari (which doesn't fire beforeinstallprompt but supports Add to Home Screen). */
function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

const DISMISS_KEY = "gsn-pwa-install-dismissed";

export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const oneDay = 24 * 60 * 60 * 1000;
    const recentlyDismissed = dismissedAt && Date.now() - dismissedAt < oneDay;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!recentlyDismissed) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS: no beforeinstallprompt — show manual instructions after a delay
    if (isIos() && !recentlyDismissed) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === "accepted") setVisible(false);
      setDeferred(null);
    } else if (isIos()) {
      setShowIosSheet(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIosSheet(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        data-testid="pwa-install-banner"
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[10000] rounded-2xl bg-white shadow-2xl shadow-ocean-500/25 border border-ocean-100 p-4 flex items-start gap-3 animate-fade-up"
      >
        <div className="w-12 h-12 rounded-xl bg-ocean-500 shrink-0 flex items-center justify-center overflow-hidden">
          <img src="/icon-192.png" alt="GSN Fish" className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold text-slate-900 leading-tight">
            Install GSN Fresh Fish
          </div>
          <div className="mr-text text-slate-600 text-sm mt-0.5">
            होम स्क्रीनवर अ‍ॅप जोडा · Quick access, works offline
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={install}
              data-testid="pwa-install-btn"
              className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Download className="w-4 h-4" /> Install
            </button>
            <button
              onClick={dismiss}
              data-testid="pwa-dismiss-btn"
              className="text-slate-500 hover:text-slate-800 text-sm font-semibold px-3 py-2 rounded-full transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Close"
          data-testid="pwa-close-btn"
          className="absolute top-2 right-2 w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showIosSheet && (
        <div
          data-testid="pwa-ios-sheet"
          className="fixed inset-0 z-[10001] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={dismiss}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="GSN Fish" className="w-12 h-12 rounded-xl" />
              <div>
                <div className="font-display font-extrabold text-slate-900">Install on iPhone</div>
                <div className="text-xs text-slate-500">Safari · Add to Home Screen</div>
              </div>
            </div>
            <ol className="mt-5 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <span>Tap the <Share className="inline w-4 h-4 mx-1 -mt-1 text-ocean-600" /> <b>Share</b> button in Safari.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <span>Scroll down and choose <b>Add to Home Screen</b>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <span>Tap <b>Add</b> — the fish icon will appear on your Home screen.</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-6 w-full inline-flex items-center justify-center bg-ocean-500 hover:bg-ocean-600 text-white font-semibold py-2.5 rounded-full transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
