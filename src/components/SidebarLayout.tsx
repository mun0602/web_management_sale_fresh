"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LayoutDashboard, Users, CreditCard, Activity, Package, LogOut, FileText, Menu, X } from 'lucide-react';
import { authApi } from '@/api/auth';

const SidebarLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState('ADMIN');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const user = await authApi.getMe();
        if (user && user.roles && user.roles.length > 0) {
          setRole(user.roles[0]);
        } else if (user && (user as any).role) {
          setRole((user as any).role);
        }
      } catch (error: any) {
        if (error.name !== 'CanceledError') {
          router.replace('/login');
        }
      }
    }

    if (pathname !== '/login') void loadSession();
    return () => controller.abort();
  }, [pathname, router]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    const toastId = toast.loading('Đang đăng xuất...');
    try {
      await authApi.logout();
      toast.success('Đã đăng xuất thành công!', { id: toastId });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Lỗi khi đăng xuất', { id: toastId });
    }
  };

  // If we are on the login page, don't show the sidebar layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={closeSidebar}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="sidebar-logo" style={{ marginBottom: 0 }}>
            <Activity size={24} color="var(--primary)" />
            SaleKeyboard
          </div>
          <button className="mobile-menu-btn" style={{ marginRight: 0 }} onClick={closeSidebar} aria-label="Đóng menu quản trị">
            <X size={24} />
          </button>
        </div>
        
        <ul className="nav-menu">
          <li>
            <Link href="/" onClick={closeSidebar} className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Tổng quan
            </Link>
          </li>
          <li>
            <Link href="/users" onClick={closeSidebar} className={`nav-item ${pathname === '/users' ? 'active' : ''}`}>
              <Users size={20} />
              Người dùng
            </Link>
          </li>
          <li>
            <Link href="/plans" onClick={closeSidebar} className={`nav-item ${pathname === '/plans' ? 'active' : ''}`}>
              <Package size={20} />
              Gói dịch vụ
            </Link>
          </li>
          <li>
            <Link href="/subscriptions" onClick={closeSidebar} className={`nav-item ${pathname === '/subscriptions' ? 'active' : ''}`}>
              <CreditCard size={20} />
              Thuê bao
            </Link>
          </li>
          <li>
            <Link href="/payments" onClick={closeSidebar} className={`nav-item ${pathname === '/payments' ? 'active' : ''}`}>
              <Activity size={20} />
              Giao dịch
            </Link>
          </li>
          <li>
            <Link href="/audit" onClick={closeSidebar} className={`nav-item ${pathname === '/audit' ? 'active' : ''}`}>
              <FileText size={20} />
              Audit Log
            </Link>
          </li>
        </ul>
        
        <div style={{ marginTop: 'auto' }}>
          <button 
            className="nav-item" 
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="top-header">
          <div className="flex items-center">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Mở menu quản trị" aria-expanded={sidebarOpen}>
              <Menu size={24} />
            </button>
            <div>
              <h2>Admin Portal</h2>
              <p>Quản trị hệ thống SaleKeyboard</p>
            </div>
          </div>
          
          <div className="user-profile">
            <div className="flex-col hide-on-mobile" style={{ alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 600 }}>{role === 'SUPER_ADMIN' ? 'Super Admin' : role}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{role}</span>
            </div>
            <div className="avatar">{role.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>
        
        {/* Global Demo Mode Warning Banner */}
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.15)', 
          border: '1px solid var(--warning)', 
          color: 'var(--warning)', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          marginBottom: '2rem', 
          fontSize: '0.875rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontWeight: 500
        }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠</span>
          <span>
            <strong>Chế độ mô phỏng (Demo Mode):</strong> Dữ liệu và biểu đồ trên hệ thống hiện tại là giả lập. Các hành động quản trị (như Hoàn tiền, Khóa tài khoản, Thêm Admin, Thay đổi gói cước, Khởi động lại Server, v.v.) chỉ mang tính chất minh họa giao diện và chưa tác động tới dữ liệu thực tế.
          </span>
        </div>
        
        {children}
      </main>
    </div>
  );
};

export default SidebarLayout;
