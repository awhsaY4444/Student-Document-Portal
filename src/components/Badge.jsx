import { titleStatus } from '../utils/format.js';

const styles = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  paid: 'bg-green-100 text-green-800 border-green-200'
};

export default function Badge({ value }) {
  const key = String(value || 'pending').toLowerCase();
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-semibold ${styles[key] || styles.pending}`}>
      {titleStatus(value)}
    </span>
  );
}
