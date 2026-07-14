'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import apiClient from '@/lib/api';
import { formatCurrency, exportToCsv } from '@/lib/utils';
import { Download } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

interface RevenueBucket {
  bucket: string;
  revenue: number;
  commission: number;
  jobCount: number;
}

interface JobsReport {
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

interface TechnicianReportRow {
  id: string;
  name: string;
  phone: string;
  status: string;
  rating: number;
  trustScore: number;
  totalJobs: number;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#ec4899'];

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
    >
      <Download size={14} /> Export CSV
    </button>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const [revenue, setRevenue] = useState<RevenueBucket[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const [jobsReport, setJobsReport] = useState<JobsReport | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [technicians, setTechnicians] = useState<TechnicianReportRow[]>([]);
  const [techLoading, setTechLoading] = useState(true);

  const loadRevenue = useCallback(async (p: Period) => {
    setRevenueLoading(true);
    try {
      const res = await apiClient.get('/api/v1/reports/revenue', { params: { period: p } });
      setRevenue(res.data.data);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue(period);
  }, [period, loadRevenue]);

  useEffect(() => {
    apiClient.get('/api/v1/reports/jobs').then((r) => setJobsReport(r.data)).finally(() => setJobsLoading(false));
    apiClient.get('/api/v1/reports/technicians').then((r) => setTechnicians(r.data)).finally(() => setTechLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue, job, and technician performance</p>
      </div>

      <SectionCard
        title="Revenue"
        subtitle="Job revenue and commission earned over time"
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize ${period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <ExportButton
              onClick={() =>
                exportToCsv(`revenue-${period}.csv`, revenue.map((r) => ({ bucket: r.bucket, revenue: r.revenue, commission: r.commission, jobCount: r.jobCount })))
              }
            />
          </div>
        }
      >
        {revenueLoading ? (
          <div className="h-72 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
              <Tooltip formatter={(value) => formatCurrency(Number(Array.isArray(value) ? value[0] : (value ?? 0)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="commission" name="Commission" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Jobs by Status"
          action={
            jobsReport && (
              <ExportButton onClick={() => exportToCsv('jobs-by-status.csv', jobsReport.byStatus)} />
            )
          }
        >
          {jobsLoading ? (
            <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
          ) : jobsReport && jobsReport.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={jobsReport.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Jobs" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No job data yet</p>
          )}
        </SectionCard>

        <SectionCard
          title="Jobs by Category"
          action={
            jobsReport && (
              <ExportButton onClick={() => exportToCsv('jobs-by-category.csv', jobsReport.byCategory)} />
            )
          }
        >
          {jobsLoading ? (
            <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
          ) : jobsReport && jobsReport.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={jobsReport.byCategory} dataKey="count" nameKey="category" outerRadius={90} label={(props: any) => props.category ?? ''}>
                  {jobsReport.byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No job data yet</p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Technician Performance"
        subtitle="Ranked by trust score"
        action={
          <ExportButton
            onClick={() =>
              exportToCsv(
                'technician-performance.csv',
                technicians.map((t) => ({
                  name: t.name,
                  phone: t.phone,
                  status: t.status,
                  rating: t.rating,
                  trustScore: t.trustScore,
                  totalJobs: t.totalJobs,
                })),
              )
            }
          />
        }
      >
        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Technician</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Trust Score</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Total Jobs</th>
              </tr>
            </thead>
            <tbody>
              {techLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : technicians.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No active technicians</td></tr>
              ) : (
                technicians.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.status}</td>
                    <td className="px-4 py-3 text-gray-700">{t.rating.toFixed(1)} ★</td>
                    <td className="px-4 py-3 text-gray-700">{t.trustScore}</td>
                    <td className="px-4 py-3 text-gray-700">{t.totalJobs}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
