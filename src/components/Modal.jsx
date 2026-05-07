import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, width = 'max-w-3xl' }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4">
      <div className={`erp-card mt-8 w-full ${width}`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button className="btn-secondary p-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
