export default function StatCard({ label, value, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'border-l-college-navy',
    pending: 'border-l-amber-500',
    approved: 'border-l-green-600',
    rejected: 'border-l-red-600'
  };

  return (
    <div className={`erp-card border-l-4 ${tones[tone]} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        {Icon ? <Icon className="mt-1 h-5 w-5 text-slate-500" /> : null}
      </div>
    </div>
  );
}
