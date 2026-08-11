'use client';

import { Fragment, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, X, Pencil, ChevronDown, ChevronRight, MessageSquare, Power, PowerOff } from 'lucide-react';

interface Category { id: string; name: string; }
interface Technician {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  aadharNumber: string | null;
  status: string;
  active: boolean;
  trustScore: number;
  priorityRank: number;
  rating: string;
  serviceArea: string;
  language: string;
  createdAt: string;
  skills: { category: Category }[];
}

interface TechnicianDetail extends Technician {
  totalJobs: number;
  totalEarnings: number;
  totalCommission: number;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  BUSY: 'bg-amber-50 text-amber-700',
  OFFLINE: 'bg-gray-100 text-gray-600',
};

function CreateModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', aadharNumber: '', serviceArea: '', language: 'EN', priorityRank: 50, categoryIds: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, aadharNumber: form.aadharNumber.trim() || undefined };
      await apiClient.post('/api/v1/admin/technicians', payload);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create technician');
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((c) => c !== id) : [...f.categoryIds, id],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Add Technician</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {['name', 'phone', 'address', 'serviceArea'].map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                {field === 'serviceArea' ? 'Service Area (comma-separated localities)' : field}
              </label>
              <input
                required
                value={(form as any)[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={field === 'serviceArea' ? 'Allampatti,Sivakasi' : field === 'phone' ? '91XXXXXXXXXX' : ''}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Aadhar Number (optional)</label>
            <input
              value={form.aadharNumber}
              onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="12-digit Aadhar number"
              maxLength={12}
              pattern="\d{12}"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="EN">English</option>
              <option value="TA">Tamil</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority Rank (0-100, higher = offered jobs first)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.priorityRank}
              onChange={(e) => setForm((f) => ({ ...f, priorityRank: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Skills</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.categoryIds.includes(cat.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  technician,
  categories,
  onClose,
  onSaved,
}: {
  technician: Technician;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: technician.name,
    phone: technician.phone,
    address: technician.address ?? '',
    aadharNumber: technician.aadharNumber ?? '',
    serviceArea: technician.serviceArea,
    status: technician.status,
    active: technician.active,
    priorityRank: technician.priorityRank,
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(technician.skills.map((s) => s.category.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleCategory(id: string) {
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, aadharNumber: form.aadharNumber.trim() || undefined };
      await apiClient.patch(`/api/v1/admin/technicians/${technician.id}`, payload);

      const originalIds = technician.skills.map((s) => s.category.id);
      const toAdd = categoryIds.filter((id) => !originalIds.includes(id));
      const toRemove = originalIds.filter((id) => !categoryIds.includes(id));
      await Promise.all([
        ...toAdd.map((categoryId) =>
          apiClient.post(`/api/v1/admin/technicians/${technician.id}/skills`, { categoryId }),
        ),
        ...toRemove.map((categoryId) =>
          apiClient.delete(`/api/v1/admin/technicians/${technician.id}/skills/${categoryId}`),
        ),
      ]);

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update technician');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Edit Technician</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="91XXXXXXXXXX"
            />
            <p className="text-[11px] text-amber-600 mt-1">Changing this reassigns the technician&apos;s WhatsApp number — any in-progress WhatsApp session on the old number is abandoned.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Aadhar Number (optional)</label>
            <input
              value={form.aadharNumber}
              onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="12-digit Aadhar number"
              maxLength={12}
              pattern="\d{12}"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service Area (comma-separated localities)</label>
            <input
              required
              value={form.serviceArea}
              onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority Rank (0-100, higher = offered jobs first)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.priorityRank}
              onChange={(e) => setForm((f) => ({ ...f, priorityRank: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Skills</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    categoryIds.includes(cat.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageModal({
  technician,
  onClose,
}: {
  technician: Technician;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: boolean; error?: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const { data } = await apiClient.post(`/api/v1/admin/technicians/${technician.id}/send-message`, { message });
      setResult(data);
      if (data.sent) setMessage('');
    } catch (err: any) {
      setResult({ sent: false, error: err?.response?.data?.message ?? 'Failed to send message' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Message {technician.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSend} className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Sends a WhatsApp text directly to {technician.phone}. This only reaches them if they've messaged the bot within the last 24 hours — that's a WhatsApp platform rule, not a bug.
          </p>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            placeholder="Type your message…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {result && (
            result.sent ? (
              <p className="text-emerald-600 text-xs">Message sent.</p>
            ) : (
              <p className="text-red-600 text-xs">Not delivered: {result.error ?? 'Unknown error'}</p>
            )
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [messaging, setMessaging] = useState<Technician | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, TechnicianDetail>>({});
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | 'all'>('true');
  const limit = 20;

  async function toggleActive(t: Technician) {
    if (t.active && !window.confirm(`Deactivate ${t.name}? They will stop receiving new job offers.`)) return;
    setTogglingId(t.id);
    try {
      await apiClient.patch(`/api/v1/admin/technicians/${t.id}`, { active: !t.active });
      load();
    } finally {
      setTogglingId(null);
    }
  }

  function toggleExpand(t: Technician) {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    if (!details[t.id]) {
      apiClient.get(`/api/v1/admin/technicians/${t.id}`).then((r) => {
        setDetails((d) => ({ ...d, [t.id]: r.data }));
      });
    }
  }

  const load = () => {
    setLoading(true);
    apiClient
      .get(`/api/v1/admin/technicians?page=${page}&limit=${limit}&active=${activeFilter}`)
      .then((r) => {
        setTechnicians(r.data.data);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, activeFilter]);
  useEffect(() => {
    apiClient.get('/api/v1/admin/service-categories').then((r) => setCategories(r.data));
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Technicians</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total technicians</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value as 'true' | 'false' | 'all'); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Technician
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Trust</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rank</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Skills</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Area</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : technicians.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No technicians yet</td>
              </tr>
            ) : (
              technicians.map((t) => {
                const detail = details[t.id];
                const isExpanded = expandedId === t.id;
                return (
                  <Fragment key={t.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <button
                          onClick={() => toggleExpand(t)}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {t.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] ?? ''}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{t.trustScore}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{t.priorityRank}</td>
                      <td className="px-4 py-3 text-gray-700">⭐ {Number(t.rating).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {t.skills.map((s) => (
                            <span key={s.category.id} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {s.category.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.serviceArea}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditing(t)}
                            title="Edit technician"
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setMessaging(t)}
                            title="Message technician"
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => toggleActive(t)}
                            disabled={togglingId === t.id}
                            title={t.active ? 'Deactivate technician' : 'Activate technician'}
                            className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
                              t.active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {t.active ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <td colSpan={9} className="px-4 py-4">
                          {detail ? (
                            <div className="grid grid-cols-4 gap-4 max-w-2xl">
                              <div>
                                <p className="text-xs text-gray-500">Joined</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(detail.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Jobs</p>
                                <p className="text-sm font-medium text-gray-900">{detail.totalJobs}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Earnings</p>
                                <p className="text-sm font-medium text-gray-900">₹{Number(detail.totalEarnings).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Commission</p>
                                <p className="text-sm font-medium text-gray-900">₹{Number(detail.totalCommission).toFixed(2)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal categories={categories} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {editing && (
        <EditModal
          technician={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {messaging && (
        <MessageModal technician={messaging} onClose={() => setMessaging(null)} />
      )}
    </div>
  );
}
