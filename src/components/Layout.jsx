import { ClipboardList, FileText, LogOut, ShieldCheck, UserRoundCog } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav =
    user.role === 'admin'
      ? [{ to: '/admin', label: 'Admin Office', icon: UserRoundCog }]
      : user.role === 'dean'
        ? [{ to: '/dean', label: 'Dean Review', icon: ShieldCheck }]
        : [{ to: '/dashboard', label: 'Student Desk', icon: FileText }];

  return (
    <div className="erp-shell flex">
      <aside className="hidden min-h-screen w-64 border-r border-college-line bg-college-navy text-white md:block">
        <div className="border-b border-white/15 px-5 py-4">
          <div className="text-sm font-bold uppercase tracking-wide">NIT ERP</div>
          <div className="mt-1 text-xs text-blue-100">Document Management Cell</div>
        </div>
        <nav className="p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mb-1 flex items-center gap-2 px-3 py-2 text-sm font-semibold ${
                  active ? 'bg-white text-college-navy' : 'text-blue-50 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-college-line bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClipboardList className="h-4 w-4" />
                Home / {nav[0].label}
              </div>
              <h1 className="mt-1 text-lg font-bold text-slate-900">Student Document Management Portal</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs uppercase text-slate-500">{user.role}</div>
              </div>
              <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-4 md:px-6">{children}</main>
      </div>
    </div>
  );
}
