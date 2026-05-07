import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock3, FileText, IndianRupee, XCircle } from 'lucide-react';
import { api } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import StatCard from '../components/StatCard.jsx';
import { rupees, shortDate } from '../utils/format.js';

export default function DeanDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statData, analyticsData] = await Promise.all([api.stats(), api.analytics()]);
        setStats(statData.stats);
        setAnalytics(analyticsData);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dean Monitoring Dashboard</h2>
          <p className="text-sm text-slate-500">Read-only overview of document processing and revenue.</p>
        </div>
        {loading ? <span className="text-sm text-slate-500">Preparing analytics...</span> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Applications" value={stats?.totalApplications ?? 0} icon={FileText} />
        <StatCard label="Total Revenue" value={rupees(stats?.revenue ?? 0)} icon={IndianRupee} />
        <StatCard label="Approved" value={stats?.approved ?? 0} tone="approved" icon={CheckCircle2} />
        <StatCard label="Rejected" value={stats?.rejected ?? 0} tone="rejected" icon={XCircle} />
        <StatCard label="Pending" value={stats?.pending ?? 0} tone="pending" icon={Clock3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Requests by Department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics?.byDepartment || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="requests" fill="#17335c" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Requests by Document Type">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics?.byDocumentType || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="requests" fill="#4b8063" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ListCard title="Recent Activities" rows={analytics?.recentActivities || []} />
        <ListCard title="Latest Approvals" rows={analytics?.latestApprovals || []} />
        <section className="erp-card p-4">
          <h3 className="mb-3 font-bold text-slate-900">Payment History</h3>
          <div className="space-y-2">
            {(analytics?.payments || []).map((payment) => (
              <div key={payment.id} className="border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-college-navy">{payment.payment_id}</span>
                  <span className="font-bold">{rupees(payment.amount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{payment.application_id}</span>
                  <span>{shortDate(payment.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="erp-card p-4">
      <h3 className="mb-3 font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function ListCard({ title, rows }) {
  return (
    <section className="erp-card p-4">
      <h3 className="mb-3 font-bold text-slate-900">{title}</h3>
      <div className="space-y-2">
        {rows.map((item) => (
          <div key={item.id} className="border border-slate-200 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-college-navy">{item.id}</span>
              <Badge value={item.status} />
            </div>
            <div className="mt-1 text-slate-800">{item.full_name}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{item.department}</span>
              <span>{shortDate(item.updated_at || item.created_at)}</span>
            </div>
          </div>
        ))}
        {!rows.length ? <div className="text-sm text-slate-500">No records to show.</div> : null}
      </div>
    </section>
  );
}
