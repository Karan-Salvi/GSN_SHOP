import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Fish, Loader2, LogIn } from "lucide-react";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user && user !== false) {
    navigate("/admin/dashboard", { replace: true });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) navigate("/admin/dashboard", { replace: true });
    else setErr(res.error);
  };

  return (
    <div
      data-testid="admin-login-page"
      className="min-h-screen ocean-grid-bg flex items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          data-testid="login-brand"
          className="flex items-center gap-3 mb-8 justify-center"
        >
          <div className="w-12 h-12 rounded-xl bg-ocean-500 flex items-center justify-center text-white">
            <Fish className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl font-extrabold text-ocean-600">
              GSN Fresh Fish
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Admin Panel
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xl shadow-ocean-500/5">
          <h1 className="font-display text-2xl font-extrabold text-slate-900">
            Owner Login
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            दुकानदार लॉगिन · Manage today&apos;s catch and prices
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none px-4 py-2.5 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none px-4 py-2.5 bg-white"
              />
            </div>

            {err ? (
              <div
                data-testid="login-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
              >
                {err}
              </div>
            ) : null}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-70 text-white font-semibold px-5 py-3 rounded-full transition-colors"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <Link
            to="/"
            data-testid="back-to-site"
            className="block text-center mt-6 text-sm text-slate-500 hover:text-ocean-600 transition-colors"
          >
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
