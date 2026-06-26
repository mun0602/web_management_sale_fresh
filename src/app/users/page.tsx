"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ShieldAlert, Edit2, Lock, Trash2, Key, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/api/users';

interface User {
  id: string;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  subscriptions?: {
    id: string;
    plan: {
      name: string;
    };
    status: string;
  }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Modal thêm Admin
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('SUPPORT');
  const [submitting, setSubmitting] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers({
        q: searchQuery,
        role: selectedRole
      });
      setUsers((response.data as unknown as User[]) || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải dữ liệu người dùng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchUsers]);

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

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.createUser({
        email: newEmail,
        name: newName,
        phone: newPhone,
        password: newPassword,
        role: newRole
      });
      toast.success(`Đã thêm Admin ${newEmail} thành công`);
      setShowAddModal(false);
      // Reset form
      setNewEmail('');
      setNewName('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('SUPPORT');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi kết nối máy chủ.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${email}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await usersApi.deleteUser(id);
      toast.success('Xóa người dùng thành công');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi xóa người dùng.';
      toast.error(msg);
    }
  };

  const handleToggleLockUser = async (id: string, email: string, currentStatus: string) => {
    const isLocked = currentStatus === 'locked';
    const actionText = isLocked ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${email}"?`)) {
      return;
    }
    try {
      const newStatus = isLocked ? 'active' : 'locked';
      await usersApi.updateStatus(id, newStatus);
      toast.success(`Đã ${actionText} tài khoản thành công`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || `Lỗi khi ${actionText} tài khoản.`;
      toast.error(msg);
    }
  };

  const handleChangePassword = async (id: string, email: string) => {
    const newPassword = prompt(`Nhập mật khẩu mới cho tài khoản "${email}":`);
    if (newPassword === null) return;
    if (newPassword.trim() === '') {
      toast.error('Mật khẩu không được để trống');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }
    try {
      await usersApi.updateUser(id, { password: newPassword });
      toast.success('Đổi mật khẩu thành công!');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi đổi mật khẩu.';
      toast.error(msg);
    }
  };

  const handleRevokeSessions = async (id: string, email: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi tất cả phiên đăng nhập của "${email}"?`)) {
      return;
    }
    try {
      await usersApi.revokeSessions(id);
      toast.success('Đã thu hồi tất cả phiên đăng nhập');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi thu hồi phiên đăng nhập.';
      toast.error(msg);
    }
  };

  return (
    <div className="users-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Quản lý Người dùng</h1>
          <p>Danh sách khách hàng và phân quyền Admin thực tế trong PostgreSQL</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Thêm Admin
          </button>
        </div>
      </div>

      <div className="glass-panel mb-6 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', flex: 1 }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo email, họ tên, số điện thoại..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }} 
            />
          </div>
          
          <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            <Filter size={18} color="var(--text-secondary)" />
            <select 
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
            >
              <option value="all">Tất cả Role</option>
              <option value="user">USER (Khách hàng)</option>
              <option value="super_admin">SUPER_ADMIN</option>
              <option value="finance">FINANCE</option>
              <option value="support">SUPPORT</option>
              <option value="read_only">READ_ONLY</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách người dùng...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy người dùng nào.</div>
        ) : (
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
              {users.map((u) => {
                const latestSub = u.subscriptions && u.subscriptions[0];
                const hasActiveSub = latestSub?.status === 'active';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{u.name || 'Chưa cập nhật'}</div>
                        {u.status === 'locked' && (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>LOCKED</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{u.phone || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${u.role !== 'USER' ? 'badge-primary' : ''}`} style={{ textTransform: 'uppercase' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {latestSub ? latestSub.plan.name : 'Chưa đăng ký'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {latestSub ? (
                        <span className={`badge ${hasActiveSub ? 'badge-success' : 'badge-danger'}`}>
                          {latestSub.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--surface-border)', color: 'var(--text-secondary)' }}>NONE</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem' }} 
                          onClick={() => handleRevokeSessions(u.id, u.email)} 
                          title="Thu hồi phiên" 
                          aria-label="Thu hồi phiên đăng nhập"
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem' }} 
                          onClick={() => handleChangePassword(u.id, u.email)} 
                          title="Đổi mật khẩu" 
                          aria-label="Đổi mật khẩu"
                        >
                          <Key size={14} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ 
                            padding: '0.25rem 0.5rem',
                            color: u.status === 'locked' ? 'var(--warning)' : 'inherit',
                            borderColor: u.status === 'locked' ? 'var(--warning)' : 'inherit'
                          }} 
                          onClick={() => handleToggleLockUser(u.id, u.email, u.status)} 
                          title={u.status === 'locked' ? "Mở khóa TK" : "Khóa TK"} 
                          aria-label={u.status === 'locked' ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        >
                          {u.status === 'locked' ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                          onClick={() => handleDeleteUser(u.id, u.email)} 
                          title="Xóa người dùng" 
                          aria-label="Xóa người dùng"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
                <label htmlFor="admin-name-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Họ và tên</label>
                <input 
                  id="admin-name-input"
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="admin-phone-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Số điện thoại</label>
                <input 
                  id="admin-phone-input"
                  type="text" 
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="admin-email-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Email Admin</label>
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
                <label htmlFor="admin-password-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Mật khẩu khởi tạo</label>
                <input 
                  id="admin-password-input"
                  type="password" 
                  required 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="admin-role-select" style={{ display: 'block', marginBottom: '0.25rem' }}>Phân quyền</label>
                <select 
                  id="admin-role-select" 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="READ_ONLY">READ_ONLY</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
