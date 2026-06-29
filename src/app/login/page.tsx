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
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMsg = err.response?.data?.error?.message || 'Đăng nhập thất bại';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="login-logo-badge">
            <Activity size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Đăng nhập Admin</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Hệ thống quản trị SaleKeyboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="flex-col gap-1">
            <label htmlFor="email-input" className="input-label">Tài khoản / Email</label>
            <div className="login-input-group">
              <Mail size={18} color="var(--text-secondary)" />
              <input 
                id="email-input"
                type="text" 
                placeholder="admin@example.com" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div className="flex-col gap-1">
            <label htmlFor="password-input" className="input-label">Mật khẩu</label>
            <div className="login-input-group">
              <Lock size={18} color="var(--text-secondary)" />
              <input 
                id="password-input"
                type="password" 
                placeholder="••••••••" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary mt-4 w-full">
            {loading ? 'Đang xử lý...' : 'Đăng nhập an toàn'}
          </button>
        </form>
      </div>
    </div>
  );
}
