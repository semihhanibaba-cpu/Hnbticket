import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import CustomerPanel from './components/CustomerPanel';
import { User } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session token
    const savedToken = localStorage.getItem('b2b_session_token');
    if (savedToken) {
      validateToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (savedToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setToken(savedToken);
        setUser(data);
      } else {
        // Stale or invalid session or non-JSON response
        localStorage.removeItem('b2b_session_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('b2b_session_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedInUser: User) => {
    localStorage.setItem('b2b_session_token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('b2b_session_token');
    setToken(null);
    setUser(null);
  };

  const handleRefreshUser = () => {
    if (token) {
      validateToken(token);
    }
  };

  if (loading) {
    return (
      <div id="app_loading" className="min-h-screen bg-slate-900 flex items-center justify-center flex-col gap-4 text-slate-100">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-slate-400">HanibabaTicket Yükleniyor...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === 'admin') {
    return <AdminPanel token={token} onLogout={handleLogout} />;
  }

  return (
    <CustomerPanel 
      token={token} 
      user={user} 
      onLogout={handleLogout} 
      onRefreshUser={handleRefreshUser} 
    />
  );
}
