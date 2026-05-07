import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600">Loading portal...</div>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const roleHome = user.role === 'admin' ? '/admin' : user.role === 'dean' ? '/dean' : '/dashboard';
  if (location.pathname === '/dashboard' && user.role !== 'student') return <Navigate to={roleHome} replace />;
  if (location.pathname === '/admin' && user.role !== 'admin') return <Navigate to={roleHome} replace />;
  if (location.pathname === '/dean' && user.role !== 'dean') return <Navigate to={roleHome} replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
