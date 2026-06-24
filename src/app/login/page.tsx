"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const toastId = toast.loading('Đang xác thực...');

    try {
      await authApi.login({ email, password });
      toast.success('Đăng nhập thành công!', { id: toastId });
      router.push('/');
      router.refresh();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || 'Đăng nhập thất bại';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
      <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Activity size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
          <h2>Đăng nhập Admin</h2>
          <p>Hệ thống quản trị SaleKeyboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="flex-col gap-1">
            <label htmlFor="email-input" className="sr-only">Email quản trị viên</label>
            <div className="flex items-center gap-2" style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <Mail size={18} color="var(--text-secondary)" />
              <input 
                id="email-input"
                type="email" 
                placeholder="Email quản trị viên" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="flex-col gap-1">
            <label htmlFor="password-input" className="sr-only">Mật khẩu</label>
            <div className="flex items-center gap-2" style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <Lock size={18} color="var(--text-secondary)" />
              <input 
                id="password-input"
                type="password" 
                placeholder="Mật khẩu" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary mt-4" style={{ width: '100%' }}>
            {loading ? 'Đang xử lý...' : 'Đăng nhập an toàn'}
          </button>
        </form>
      </div>
    </div>
  );
}
