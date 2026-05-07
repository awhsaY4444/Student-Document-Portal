import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck, UserRoundCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const roleContent = {
  student: {
    label: 'Student',
    heading: 'Student Login',
    helper: 'Use your assigned institutional student credentials.',
    icon: GraduationCap
  },
  admin: {
    label: 'Admin',
    heading: 'Admin Login',
    helper: 'Authorized academic office personnel only.',
    icon: UserRoundCog
  },
  dean: {
    label: 'Dean',
    heading: 'Dean Login',
    helper: 'Restricted dean-level monitoring access.',
    icon: ShieldCheck
  }
};

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const activeRole = roleContent[selectedRole];

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== selectedRole) {
        logout();
        toast.error(`These credentials belong to a ${roleContent[user.role]?.label || user.role} account. Please select the correct login role.`);
        return;
      }
      toast.success('Logged in successfully.');
      navigate(user.role === 'admin' ? '/admin' : user.role === 'dean' ? '/dean' : '/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-100 md:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center bg-college-navy px-6 py-10 text-white">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-2 text-sm">
            <Building2 className="h-5 w-5" />
            National Institute Academic ERP
          </div>
          <h1 className="text-3xl font-bold leading-tight">Student Document Management Portal</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100">
            Internal module for document requests, fee payment, academic office processing, and dean-level monitoring.
          </p>
          <div className="mt-8 border border-white/15 bg-college-navyDark p-4">
            <div className="text-sm font-semibold">Select Login Role</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Object.entries(roleContent).map(([role, details]) => {
                const Icon = details.icon;
                const selected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    className={`border px-3 py-3 text-left transition-colors duration-150 ${
                      selected
                        ? 'border-white bg-white text-college-navy'
                        : 'border-white/20 bg-college-navyDark text-blue-50 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <Icon className="mb-2 h-5 w-5" />
                    <span className="block text-sm font-semibold">{details.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <form onSubmit={submit} className="erp-card w-full max-w-md p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="bg-college-navy p-2 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeRole.heading}</h2>
              <p className="text-xs text-slate-500">{activeRole.helper}</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
            <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-college-navy"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <button className="btn-primary w-full px-4 py-2 text-sm font-semibold" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </div>
  );
}
