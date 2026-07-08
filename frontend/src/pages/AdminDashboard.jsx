import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Fish, LogOut, Plus, Pencil, Trash2, Upload, Save, X,
  Power, PowerOff, ImageIcon, Loader2, Settings as SettingsIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";

const empty = { name_en: "", name_mr: "", price_per_kg: 0, available: true, is_special: false, description: "", image_base64: "" };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("fish");

  const [fish, setFish] = useState([]);
  const [status, setStatus] = useState({ is_open: true, notice: "" });
  const [settings, setSettings] = useState({});
  const [editing, setEditing] = useState(null); // fish being edited or null
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user === false) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const loadAll = async () => {
    try {
      const [f, s, c] = await Promise.all([api.get("/fish"), api.get("/shop-status"), api.get("/settings")]);
      setFish(f.data || []);
      setStatus(s.data || { is_open: true, notice: "" });
      setSettings(c.data || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { if (user && user !== false) loadAll(); }, [user]);

  const onLogout = async () => { await logout(); navigate("/admin", { replace: true }); };

  const openNew = () => { setEditing({ ...empty }); setFormOpen(true); };
  const openEdit = (f) => { setEditing({ ...f }); setFormOpen(true); };
  const closeForm = () => { setEditing(null); setFormOpen(false); };

  const onSaveFish = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editing, price_per_kg: Number(editing.price_per_kg) };
      if (editing.id) await api.put(`/admin/fish/${editing.id}`, payload);
      else await api.post("/admin/fish", payload);
      toast.success(editing.id ? "Fish updated" : "Fish added");
      await loadAll();
      closeForm();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this fish?")) return;
    try {
      await api.delete(`/admin/fish/${id}`);
      toast.success("Deleted");
      await loadAll();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const toggleAvailable = async (f) => {
    try {
      await api.put(`/admin/fish/${f.id}`, { ...f, available: !f.available });
      await loadAll();
    } catch (err) { toast.error("Failed to update"); }
  };

  const toggleShop = async () => {
    try {
      const next = !status.is_open;
      const { data } = await api.put("/admin/shop-status", { is_open: next, notice: status.notice });
      setStatus(data);
      toast.success(next ? "Shop marked OPEN" : "Shop marked CLOSED");
    } catch (err) { toast.error("Failed to update"); }
  };

  const updateNotice = async () => {
    try {
      const { data } = await api.put("/admin/shop-status", { is_open: status.is_open, notice: status.notice });
      setStatus(data); toast.success("Notice updated");
    } catch { toast.error("Failed"); }
  };

  const saveSettings = async () => {
    try {
      const { data } = await api.put("/admin/settings", settings);
      setSettings(data); toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
  };

  const onImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { toast.error("Image must be < 800 KB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEditing((prev) => ({ ...prev, image_base64: String(ev.target.result) }));
    reader.readAsDataURL(file);
  };

  if (user === null || user === false) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ocean-500 flex items-center justify-center text-white"><Fish className="w-5 h-5" /></div>
            <div className="leading-tight">
              <div className="font-display font-extrabold text-ocean-600">GSN Admin</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleShop} data-testid="admin-toggle-shop"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-colors ${status.is_open ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
              {status.is_open ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              {status.is_open ? "OPEN" : "CLOSED"}
            </button>
            <button onClick={onLogout} data-testid="admin-logout"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600 text-sm font-semibold px-3 py-2 rounded-full transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-1 -mb-px">
          {["fish", "notice", "settings"].map((t) => (
            <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
              className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${tab === t ? "border-ocean-500 text-ocean-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t === "fish" ? "Fish" : t === "notice" ? "Notice" : "Settings"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {tab === "fish" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-extrabold text-slate-900">Manage Fish</h1>
              <button onClick={openNew} data-testid="admin-add-fish"
                className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors">
                <Plus className="w-4 h-4" /> Add Fish
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Image</th>
                    <th className="text-left px-4 py-3">Name (EN / MR)</th>
                    <th className="text-left px-4 py-3">Price ₹/kg</th>
                    <th className="text-left px-4 py-3">Available</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fish.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">No fish yet. Add your first one.</td></tr>
                  )}
                  {fish.map((f) => (
                    <tr key={f.id} className="border-t border-slate-100" data-testid={`admin-fish-row-${f.id}`}>
                      <td className="px-4 py-3">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {f.image_base64 ? (
                            <img src={f.image_base64.startsWith("data:") ? f.image_base64 : `data:image/jpeg;base64,${f.image_base64}`}
                              alt={f.name_en} className="w-full h-full object-cover" />
                          ) : <ImageIcon className="w-5 h-5 text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{f.name_en}</div>
                        <div className="mr-text text-ocean-600">{f.name_mr}</div>
                      </td>
                      <td className="px-4 py-3 font-num text-lg text-slate-900">₹{Math.round(f.price_per_kg)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleAvailable(f)} data-testid={`toggle-avail-${f.id}`}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${f.available ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                          {f.available ? "Available" : "Out of Stock"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(f)} data-testid={`edit-fish-${f.id}`}
                          className="inline-flex items-center gap-1 text-ocean-600 hover:text-ocean-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => onDelete(f.id)} data-testid={`delete-fish-${f.id}`}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "notice" && (
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-extrabold text-slate-900 mb-4">Shop Notice</h1>
            <p className="text-sm text-slate-500 mb-4">This shows as a banner on the homepage hero (e.g. &quot;Fresh Fish Arrived Today&quot;).</p>
            <textarea rows={3} value={status.notice || ""} onChange={(e) => setStatus({ ...status, notice: e.target.value })}
              data-testid="admin-notice-input"
              className="w-full rounded-xl border border-slate-200 p-4 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none" />
            <button onClick={updateNotice} data-testid="admin-notice-save"
              className="mt-3 inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors">
              <Save className="w-4 h-4" /> Save Notice
            </button>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" /> Contact & Shop Settings
            </h1>
            <div className="space-y-4">
              {[
                ["owner_name", "Owner Name"],
                ["mobile", "Mobile Number"],
                ["whatsapp", "WhatsApp Number"],
                ["address", "Address"],
                ["business_hours", "Business Hours"],
                ["google_maps_url", "Google Maps URL"],
                ["google_maps_embed", "Google Maps Embed URL (iframe src)"],
                ["facebook_url", "Facebook URL"],
                ["instagram_url", "Instagram URL"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
                  <input value={settings[k] || ""} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
                    data-testid={`settings-${k}`}
                    className="mt-1 w-full rounded-lg border border-slate-200 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none px-4 py-2.5 bg-white" />
                </div>
              ))}
              <button onClick={saveSettings} data-testid="admin-settings-save"
                className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors">
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fish form modal */}
      {formOpen && editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={onSaveFish} data-testid="fish-form" className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display text-xl font-extrabold">{editing.id ? "Edit Fish" : "Add Fish"}</h2>
              <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name (English)" testId="form-name-en" value={editing.name_en} onChange={(v) => setEditing({ ...editing, name_en: v })} required />
                <Field label="नाव (मराठी)" testId="form-name-mr" value={editing.name_mr} onChange={(v) => setEditing({ ...editing, name_mr: v })} required />
              </div>
              <Field type="number" label="Price per kg (₹)" testId="form-price" value={editing.price_per_kg}
                onChange={(v) => setEditing({ ...editing, price_per_kg: v })} required />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
                <textarea rows={2} value={editing.description || ""} data-testid="form-description"
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none px-4 py-2.5" />
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" data-testid="form-available" checked={!!editing.available}
                    onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                    className="w-4 h-4 accent-ocean-500" />
                  Available
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" data-testid="form-special" checked={!!editing.is_special}
                    onChange={(e) => setEditing({ ...editing, is_special: e.target.checked })}
                    className="w-4 h-4 accent-amber-500" />
                  Today&apos;s Special
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Image (max 800KB)</label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-full transition-colors">
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" accept="image/*" onChange={onImageFile} data-testid="form-image" className="hidden" />
                  </label>
                  {editing.image_base64 ? (
                    <img src={editing.image_base64.startsWith("data:") ? editing.image_base64 : `data:image/jpeg;base64,${editing.image_base64}`}
                      alt="preview" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                  ) : <span className="text-xs text-slate-400">No image chosen</span>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="text-slate-600 hover:text-slate-900 font-semibold px-4 py-2 rounded-full">Cancel</button>
              <button type="submit" data-testid="form-submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-70 text-white font-semibold px-5 py-2 rounded-full transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, testId, type = "text", required }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} data-testid={testId}
        className="mt-1 w-full rounded-lg border border-slate-200 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none px-4 py-2.5 bg-white" />
    </div>
  );
}
