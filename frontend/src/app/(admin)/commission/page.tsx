'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface Rule {
  id: string;
  paymentMode: string;
  commissionType: string;
  commissionValue: string;
  active: boolean;
  effectiveFrom: string;
}

interface PaymentModeSetting {
  paymentMode: string;
  enabled: boolean;
}

function PaymentModesCard() {
  const [modes, setModes] = useState<PaymentModeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiClient.get('/api/v1/admin/payment-modes').then((r) => setModes(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function toggle(mode: string, enabled: boolean) {
    setSavingMode(mode);
    setError('');
    try {
      await apiClient.patch(`/api/v1/admin/payment-modes/${mode}`, { enabled });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update payment mode');
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <h2 className="font-medium text-gray-900 mb-1 text-sm">Payment Modes</h2>
      <p className="text-xs text-gray-500 mb-4">Which payment modes technicians can offer customers when completing a job. At least one must stay enabled.</p>
      {loading ? (
        <div className="h-5 w-64 bg-gray-100 rounded animate-pulse" />
      ) : (
        <div className="flex flex-wrap gap-4">
          {modes.map((m) => (
            <label key={m.paymentMode} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={m.enabled}
                disabled={savingMode === m.paymentMode}
                onChange={(e) => toggle(m.paymentMode, e.target.checked)}
              />
              {m.paymentMode}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {m.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-red-600 text-xs mt-3">{error}</p>}
    </div>
  );
}

export default function CommissionPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ paymentMode: 'CASH', commissionType: 'FLAT', commissionValue: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient.get('/api/v1/admin/commission-rules').then((r) => setRules(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/api/v1/admin/commission-rules', {
        ...form,
        commissionValue: parseFloat(form.commissionValue),
      });
      setShowCreate(false);
      setForm({ paymentMode: 'CASH', commissionType: 'FLAT', commissionValue: '' });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commission Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Active commission rates by payment mode</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> New Rule
        </button>
      </div>

      <PaymentModesCard />

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-medium text-gray-900 mb-4 text-sm">Create New Rule</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
              <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.commissionType} onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="FLAT">FLAT (₹)</option>
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input required type="number" step="0.01" value={form.commissionValue} onChange={(e) => setForm((f) => ({ ...f, commissionValue: e.target.value }))} className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 20 or 5" />
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-3">Creating a new rule will deactivate the current rule for the same payment mode.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payment Mode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Value</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Effective From</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No commission rules</td></tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.paymentMode}</td>
                  <td className="px-4 py-3 text-gray-700">{r.commissionType}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.commissionType === 'FLAT' ? `₹${r.commissionValue}` : `${r.commissionValue}%`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.effectiveFrom)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
