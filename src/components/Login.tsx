import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş yapılamadı.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div id="login_card" className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <Logo size="lg" className="mb-4" />
          <p className="text-orange-500 text-3xs font-bold uppercase tracking-wider mt-2">Gıda Toptan Bayi Portalı</p>
          <p className="text-slate-400 text-xs mt-2">Kurumsal bayi hesabınızla güvenli giriş yapın.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">E-Posta veya Kullanıcı Adı</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <User className="w-5 h-5" />
              </span>
              <input
                id="login_email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin veya ornek@firma.com"
                className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Şifre</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="login_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          <button
            id="login_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-orange-500/20 active:scale-[0.98]"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-900 pt-6">
          <p className="text-slate-500 text-xs">
            Giriş bilgilerinizi unuttuysanız veya bakiye sorunlarınız için lütfen sistem yöneticinizle iletişime geçin.
          </p>
          <div className="mt-3 flex justify-center gap-4 text-slate-400 text-xs">
            <span>Admin: admin</span>
            <span>Şifre: admin1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}
