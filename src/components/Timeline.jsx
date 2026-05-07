import { CheckCircle2, Circle, XCircle } from 'lucide-react';

export default function Timeline({ application }) {
  const status = application?.status || 'pending';
  const steps = [
    { key: 'applied', label: 'Applied', done: true },
    { key: 'paid', label: 'Payment Completed', done: application?.payment_status === 'paid' },
    { key: 'review', label: 'Under Review', done: ['under_review', 'approved', 'rejected'].includes(status) },
    { key: 'approved', label: 'Approved', done: status === 'approved' },
    { key: 'rejected', label: 'Rejected', done: status === 'rejected' }
  ];

  if (!application) {
    return <div className="text-sm text-slate-500">Submit an application to view the status timeline.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-800">{application.id} - {application.document_type}</div>
      {steps.map((step) => {
        const Icon = step.key === 'rejected' && step.done ? XCircle : step.done ? CheckCircle2 : Circle;
        return (
          <div key={step.key} className="flex items-center gap-3 text-sm">
            <Icon className={`h-5 w-5 ${step.done ? (step.key === 'rejected' ? 'text-red-600' : 'text-green-700') : 'text-slate-400'}`} />
            <span className={step.done ? 'font-semibold text-slate-900' : 'text-slate-500'}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
