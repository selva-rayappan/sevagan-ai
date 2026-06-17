'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Briefcase, DollarSign, PercentCircle, Wrench, FileWarning, CheckCircle } from 'lucide-react';

interface Kpis {
  jobsToday: number;
  revenueToday: number;
  commissionEarned: number;
  activeTechnicians: number;
  pendingSettlements: number;
  openDisputes: number;
  totalJobs: number;
  completedJobs: number;
}

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/dashboard/kpis');
      setKpis(res.data);
    } catch {
      // token expired handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
    const interval = setInterval(fetchKpis, 30_000);
    return () => clearInterval(interval);
  }, [fetchKpis]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live operations overview · auto-refreshes every 30s</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Jobs Today" value={kpis.jobsToday} icon={Briefcase} color="bg-indigo-500" />
            <KpiCard title="Revenue Today" value={formatCurrency(kpis.revenueToday)} icon={DollarSign} color="bg-emerald-500" />
            <KpiCard title="Commission Earned" value={formatCurrency(kpis.commissionEarned)} icon={PercentCircle} color="bg-amber-500" />
            <KpiCard title="Active Technicians" value={kpis.activeTechnicians} icon={Wrench} color="bg-blue-500" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Pending Settlements" value={kpis.pendingSettlements} icon={FileWarning} color="bg-orange-500" />
            <KpiCard title="Open Disputes" value={kpis.openDisputes} icon={FileWarning} color="bg-red-500" />
            <KpiCard title="Total Jobs" value={kpis.totalJobs} icon={Briefcase} color="bg-purple-500" />
            <KpiCard title="Completed Jobs" value={kpis.completedJobs} icon={CheckCircle} color="bg-teal-500" />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Failed to load KPIs. Please refresh.</p>
      )}
    </div>
  );
}
