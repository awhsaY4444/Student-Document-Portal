import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('portal_token');
    if (!saved) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('portal_token');
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  async function login(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('portal_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('portal_token');
    setUser(null);
  }

  const value = useMemo(() => ({ user, booting, login, logout }), [user, booting]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
