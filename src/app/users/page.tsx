"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ShieldAlert, Lock, Trash2, Key, Unlock, Plus, Zap, RotateCcw, CreditCard, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/api/users';

interface AiQuota {
  limit: number;
  usage: number;
  isUnlimited: boolean;
}

interface User {
  id: string;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  aiQuota?: AiQuota;
  subscriptions?: {
    id: string;
    plan: { name: string };
    status: string;
    endDate: string;
  }[];
}

type Tab = 'keyboard' | 'admin';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('keyboard');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal tạo thành viên bàn phím
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  // Modal tạo admin
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('SUPPORT');
  const [submitting, setSubmitting] = useState(false);

  // Modal cấp thêm AI credit
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditTarget, setCreditTarget] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);

  const roleFilter = activeTab === 'keyboard' ? 'user' : 'admin_roles';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { q: searchQuery };
      if (activeTab === 'keyboard') {
        params.role = 'user';
      }
      const response = await usersApi.getUsers(params);
      let list = (response.data as unknown as User[]) || [];
      if (activeTab === 'admin') {
        list = list.filter(u => u.role !== 'USER');
      }
      setUsers(list);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải dữ liệu người dùng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Đóng modal bằng Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowKeyboardModal(false);
        setShowAdminModal(false);
        setShowCreditModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const resetForm = () => {
    setNewEmail(''); setNewName(''); setNewPhone(''); setNewPassword(''); setNewRole('SUPPORT');
  };

  // Tạo thành viên bàn phím
  const handleCreateKeyboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.createUser({ email: newEmail, name: newName, phone: newPhone, password: newPassword, role: 'USER' });
      toast.success(`✅ Đã tạo thành viên bàn phím: ${newEmail}`);
      setShowKeyboardModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tạo admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.createUser({ email: newEmail, name: newName, phone: newPhone, password: newPassword, role: newRole });
      toast.success(`✅ Đã tạo Admin ${newRole}: ${newEmail}`);
      setShowAdminModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Xóa người dùng "${email}"? Không thể hoàn tác.`)) return;
    try {
      await usersApi.deleteUser(id);
      toast.success('Đã xóa người dùng');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi xóa.');
    }
  };

  const handleToggleLock = async (id: string, email: string, status: string) => {
    const isLocked = status === 'locked';
    if (!confirm(`${isLocked ? 'Mở khóa' : 'Khóa'} tài khoản "${email}"?`)) return;
    try {
      await usersApi.updateStatus(id, isLocked ? 'active' : 'locked');
      toast.success(`Đã ${isLocked ? 'mở khóa' : 'khóa'} tài khoản`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi thao tác.');
    }
  };

  const handleChangePassword = async (id: string, email: string) => {
    const pwd = prompt(`Nhập mật khẩu mới cho "${email}":`);
    if (!pwd) return;
    if (pwd.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    try {
      await usersApi.updateUser(id, { password: pwd });
      toast.success('Đổi mật khẩu thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi đổi mật khẩu.');
    }
  };

  const handleResetQuota = async (u: User) => {
    if (!confirm(`Reset AI quota về 0 cho "${u.email}"?`)) return;
    try {
      await usersApi.resetAiQuota(u.id);
      toast.success('Đã reset AI quota');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi reset quota.');
    }
  };

  const handleAddCredit = async () => {
    if (!creditTarget) return;
    setSubmitting(true);
    try {
      await usersApi.addAiCredit(creditTarget.id, creditAmount);
      toast.success(`✅ Đã cấp thêm ${creditAmount} lượt AI cho ${creditTarget.email}`);
      setShowCreditModal(false);
      setCreditTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi cấp credit.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAiQuota = (u: User) => {
    const q = u.aiQuota;
    if (!q) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
    if (q.isUnlimited) {
      return <span className="badge badge-success">∞ Không giới hạn</span>;
    }
    const realUsage = q.usage;
    const displayUsage = Math.max(0, realUsage);
    const bonus = realUsage < 0 ? Math.abs(realUsage) : 0;
    const remaining = q.limit - realUsage;
    
    const pct = q.limit > 0 ? (displayUsage / q.limit) * 100 : 0;
    const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)';
    
    return (
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color }}>
          {displayUsage}/{q.limit} lượt
          {bonus > 0 && <span style={{ color: 'var(--success)', marginLeft: 4 }}>+{bonus}</span>}
        </div>
        <div style={{
          height: 4, borderRadius: 2, background: 'var(--surface-border)', marginTop: 3, overflow: 'hidden'
        }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          Còn: {remaining}
        </div>
      </div>
    );
  };

  const keyboardUsers = users;
  const isKeyboard = activeTab === 'keyboard';

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Quản lý Người dùng</h1>
          <p>Thành viên bàn phím & Quản trị viên trong PostgreSQL</p>
        </div>
        <div className="flex gap-3">
          {isKeyboard ? (
            <button id="btn-add-keyboard-user" className="btn btn-primary" onClick={() => setShowKeyboardModal(true)}>
              <UserPlus size={16} style={{ marginRight: '0.4rem' }} />
              Thêm thành viên BĐS
            </button>
          ) : (
            <button id="btn-add-admin" className="btn btn-primary" onClick={() => setShowAdminModal(true)}>
              <Plus size={16} style={{ marginRight: '0.4rem' }} />
              Thêm Admin
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '2px solid var(--surface-border)' }}>
        <button
          id="tab-keyboard"
          onClick={() => setActiveTab('keyboard')}
          style={{
            padding: '0.6rem 1.2rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: isKeyboard ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: isKeyboard ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -2,
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
        >
          <Users size={16} /> Thành viên Bàn phím
        </button>
        <button
          id="tab-admin"
          onClick={() => setActiveTab('admin')}
          style={{
            padding: '0.6rem 1.2rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: !isKeyboard ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: !isKeyboard ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -2,
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
        >
          <ShieldAlert size={16} /> Quản trị viên
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel mb-6 p-4">
        <div className="flex items-center gap-2">
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Tìm kiếm theo email, họ tên, số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {isKeyboard ? (
              <div>
                <UserPlus size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <div>Chưa có thành viên bàn phím. Nhấn <strong>"Thêm thành viên BĐS"</strong> để tạo.</div>
              </div>
            ) : 'Không tìm thấy quản trị viên nào.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>User / Email</th>
                <th style={{ padding: '1rem' }}>SĐT</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Gói hiện tại</th>
                {isKeyboard && <th style={{ padding: '1rem' }}>AI Credit hôm nay</th>}
                <th style={{ padding: '1rem' }}>TK</th>
                <th style={{ padding: '1rem' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const latestSub = u.subscriptions?.[0];
                const hasActiveSub = latestSub?.status === 'active';
                const isLocked = u.status === 'locked';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{u.name || 'Chưa cập nhật'}</div>
                        {isLocked && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>LOCKED</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${u.role !== 'USER' ? 'badge-primary' : ''}`} style={{ textTransform: 'uppercase' }}>
                        {u.role === 'USER' ? '🔑 BĐS' : u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {latestSub ? (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{latestSub.plan.name}</div>
                          <span className={`badge ${hasActiveSub ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {latestSub.status.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Chưa đăng ký</span>
                      )}
                    </td>
                    {isKeyboard && (
                      <td style={{ padding: '1rem' }}>
                        {renderAiQuota(u)}
                      </td>
                    )}
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${!isLocked ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {isLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {isKeyboard && (
                          <>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                              onClick={() => { setCreditTarget(u); setCreditAmount(10); setShowCreditModal(true); }}
                              title="Cấp thêm AI credit"
                              aria-label="Cấp thêm AI credit"
                            >
                              <Zap size={14} />
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                              onClick={() => handleResetQuota(u)}
                              title="Reset AI quota"
                              aria-label="Reset AI quota về 0"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </>
                        )}
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
                            color: isLocked ? 'var(--warning)' : 'inherit',
                            borderColor: isLocked ? 'var(--warning)' : 'inherit'
                          }}
                          onClick={() => handleToggleLock(u.id, u.email, u.status)}
                          title={isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                          aria-label={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
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

      {/* Modal tạo thành viên bàn phím */}
      {showKeyboardModal && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="modal-kb-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowKeyboardModal(false); }}
        >
          <div className="glass-card" style={{ width: 420, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <UserPlus size={22} color="var(--primary)" />
              <h3 id="modal-kb-title" style={{ margin: 0 }}>Thêm Thành viên Bàn phím BĐS</h3>
            </div>
            <form onSubmit={handleCreateKeyboardUser} className="flex-col gap-4">
              <div>
                <label htmlFor="kb-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Họ và tên</label>
                <input id="kb-name" type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="kb-phone" style={{ display: 'block', marginBottom: '0.25rem' }}>Số điện thoại</label>
                <input id="kb-phone" type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="kb-email" style={{ display: 'block', marginBottom: '0.25rem' }}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="kb-email" type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="vd: nguyenvana@gmail.com"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="kb-pass" style={{ display: 'block', marginBottom: '0.25rem' }}>Mật khẩu khởi tạo <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="kb-pass" type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--surface-bg)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--primary)' }}>
                Role: <strong>USER (Bàn phím BĐS)</strong> — Mặc định 5 lượt AI/ngày, nâng lên khi gán gói.
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowKeyboardModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : '✅ Tạo thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tạo Admin */}
      {showAdminModal && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="modal-admin-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdminModal(false); }}
        >
          <div className="glass-card" style={{ width: 420, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <ShieldAlert size={22} color="var(--primary)" />
              <h3 id="modal-admin-title" style={{ margin: 0 }}>Thêm Quản trị viên mới</h3>
            </div>
            <form onSubmit={handleCreateAdmin} className="flex-col gap-4">
              <div>
                <label htmlFor="admin-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Họ và tên</label>
                <input id="admin-name" type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="admin-phone" style={{ display: 'block', marginBottom: '0.25rem' }}>Số điện thoại</label>
                <input id="admin-phone" type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="admin-email" style={{ display: 'block', marginBottom: '0.25rem' }}>Email Admin <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="admin-email" type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="admin-pass" style={{ display: 'block', marginBottom: '0.25rem' }}>Mật khẩu khởi tạo <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="admin-pass" type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="admin-role" style={{ display: 'block', marginBottom: '0.25rem' }}>Phân quyền</label>
                <select id="admin-role" value={newRole} onChange={e => setNewRole(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  <option value="SUPER_ADMIN">SUPER_ADMIN — Toàn quyền</option>
                  <option value="FINANCE">FINANCE — Quản lý tài chính</option>
                  <option value="SUPPORT">SUPPORT — Hỗ trợ khách hàng</option>
                  <option value="READ_ONLY">READ_ONLY — Chỉ xem</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdminModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Thêm Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cấp thêm AI Credit */}
      {showCreditModal && creditTarget && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="modal-credit-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowCreditModal(false); setCreditTarget(null); }}}
        >
          <div className="glass-card" style={{ width: 380, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Zap size={22} color="var(--success)" />
              <h3 id="modal-credit-title" style={{ margin: 0 }}>Cấp thêm AI Credit</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Thành viên: <strong>{creditTarget.email}</strong>
            </p>
            {creditTarget.aiQuota && (
              <div style={{ padding: '0.75rem', background: 'var(--surface-bg)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                Hạn ngạch hôm nay: <strong>{creditTarget.aiQuota.usage}</strong> / {creditTarget.aiQuota.isUnlimited ? '∞' : creditTarget.aiQuota.limit} lượt đã dùng
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="credit-amount" style={{ display: 'block', marginBottom: '0.25rem' }}>Số lượt muốn cấp thêm</label>
              <input
                id="credit-amount"
                type="number"
                min={1} max={9999}
                value={creditAmount}
                onChange={e => setCreditAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              💡 Cấp thêm sẽ trừ usage hiện tại của hôm nay (cho phép dùng thêm {creditAmount} lượt).
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline" onClick={() => { setShowCreditModal(false); setCreditTarget(null); }}>Hủy</button>
              <button className="btn btn-primary" disabled={submitting} onClick={handleAddCredit}
                style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
                {submitting ? 'Đang cấp...' : `⚡ Cấp ${creditAmount} lượt`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
