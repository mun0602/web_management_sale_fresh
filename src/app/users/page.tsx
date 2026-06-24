"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, Edit2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    if (showAddModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Chế độ Demo: Tính năng thêm quản trị viên bị khóa.');
  };

  return (
    <div className="users-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Quản lý Người dùng</h1>
          <p>Danh sách khách hàng và phân quyền Admin</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Thêm Admin
          </button>
          <button className="btn btn-outline" onClick={() => toast.error('Chế độ Demo: Tính năng export bị khóa.')}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel mb-6 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', flex: 1 }}>
            <Search size={18} color="var(--text-secondary)" />
            <input type="text" placeholder="Tìm kiếm theo email, số điện thoại..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }} />
          </div>
          
          <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <Filter size={18} color="var(--text-secondary)" />
            <select style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}>
              <option value="all">Tất cả Role</option>
              <option value="user">User (Khách hàng)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>User / Email</th>
              <th style={{ padding: '1rem' }}>SĐT</th>
              <th style={{ padding: '1rem' }}>Role</th>
              <th style={{ padding: '1rem' }}>Gói hiện tại</th>
              <th style={{ padding: '1rem' }}>Trạng thái</th>
              <th style={{ padding: '1rem' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 500 }}>Nguyen Van A</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>nguyenvana@gmail.com</div>
              </td>
              <td style={{ padding: '1rem' }}>0901234567</td>
              <td style={{ padding: '1rem' }}><span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-secondary)' }}>USER</span></td>
              <td style={{ padding: '1rem' }}>Pro (1 tháng)</td>
              <td style={{ padding: '1rem' }}><span className="badge badge-success">Active</span></td>
              <td style={{ padding: '1rem' }}>
                <div className="flex gap-2">
                  <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => toast.error('Chế độ Demo: Tính năng thu hồi phiên đăng nhập bị khóa.')} title="Revoke Session" aria-label="Thu hồi phiên đăng nhập"><ShieldAlert size={14} /></button>
                  <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => toast.error('Chế độ Demo: Tính năng khóa tài khoản bị khóa.')} title="Khóa TK" aria-label="Khóa tài khoản"><Lock size={14} /></button>
                  <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => toast.error('Chế độ Demo: Tính năng sửa hồ sơ bị khóa.')} title="Sửa Profile" aria-label="Sửa Profile"><Edit2 size={14} /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="modal-title" style={{ marginTop: 0 }}>Thêm Quản trị viên mới</h3>
            <form onSubmit={handleAddAdmin} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="admin-email-input" style={{ display: 'block', marginBottom: '0.5rem' }}>Email Admin</label>
                <input 
                  id="admin-email-input"
                  type="email" 
                  required 
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="admin-role-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Phân quyền</label>
                <select id="admin-role-select" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  <option>FINANCE</option>
                  <option>SUPPORT</option>
                  <option>READ_ONLY</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled>Thêm (Bị khóa trong Demo)</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
