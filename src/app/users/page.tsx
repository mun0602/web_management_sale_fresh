"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Lock, Trash2, Key, Unlock, Zap, RotateCcw, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/api/users';
import { plansApi } from '@/api/plans';
import { authApi } from '@/api/auth';

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

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal tạo người dùng (gộp chung)
  const [showUserModal, setShowUserModal] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountRole, setAccountRole] = useState<'USER' | 'SALE'>('USER');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  // Modal cấp thêm AI credit
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditTarget, setCreditTarget] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { q: searchQuery, role: currentRole === 'SALE' ? 'user' : 'all' };
      const response = await usersApi.getUsers(params);
      const list = (response.data as unknown as User[]) || [];
      setUsers(list);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải dữ liệu người dùng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentRole]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await plansApi.getPlans();
        const list = ((response.data as unknown as Plan[]) || []).filter((p) => !p.id.startsWith('addon'));
        setPlans(list);
        if (list.length > 0) {
          setSelectedPlanId((current) => current || list[0].id);
          setDurationDays((current) => current || parseDefaultDuration(list[0].features));
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      }
    };
    fetchPlans();
  }, []);

  // Đóng modal bằng Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserModal(false);
        setShowCreditModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const resetForm = () => {
    setNewEmail('');
    setNewName('');
    setNewPhone('');
    setNewPassword('');
    setAccountRole('USER');
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
      setDurationDays(parseDefaultDuration(plans[0].features));
    } else {
      setDurationDays(30);
    }
  };

  const parseAiLimit = (features: string) => {
    if (features.includes('ai_unlimited')) return '∞';
    const token = features.split(',').map(f => f.trim()).find(f => f.startsWith('ai_limit:'));
    return token ? token.slice('ai_limit:'.length) : '5';
  };

  const parseDefaultDuration = (features: string) => {
    const token = features.split(',').map(f => f.trim()).find(f => f.startsWith('duration_days:'));
    const parsed = token ? Number(token.slice('duration_days:'.length)) : 30;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
  };

  const calcProjectedRevenue = (plan: Plan | undefined, days: number) => {
    if (!plan) return 0;
    if (plan.features.split(',').map(f => f.trim()).includes('fixed_price')) return plan.price;
    return Math.round((plan.price * Number(days || 0)) / 30);
  };

  const selectedPlan = accountRole === 'USER' ? plans.find((p) => p.id === selectedPlanId) : undefined;
  const projectedRevenue = calcProjectedRevenue(selectedPlan, durationDays);
  const isSale = currentRole === 'SALE';

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await authApi.getMe();
        setCurrentRole((me as unknown as { role?: string }).role || '');
      } catch (err) {
        console.error('Error loading current user:', err);
      }
    };
    loadMe();
  }, []);

  // Tạo tài khoản USER bàn phím.
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSale && !selectedPlanId) {
      toast.error('Tài khoản sale bắt buộc chọn gói khi tạo user.');
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.createUser({
        email: newEmail,
        name: newName,
        phone: newPhone,
        password: newPassword,
        accountRole,
        planId: accountRole === 'USER' ? selectedPlanId : '',
        durationDays: Number(durationDays),
      });
      toast.success(`✅ Đã tạo thành công tài khoản: ${newEmail}`);
      setShowUserModal(false);
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

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{isSale ? 'User của tôi' : 'Quản lý Người dùng'}</h1>
          <p>{isSale ? 'Tạo user bàn phím và bán gói dịch vụ' : 'Thành viên bàn phím & Quản trị viên trong PostgreSQL'}</p>
        </div>
        <div className="flex gap-2">
          <button 
            id="btn-add-user" 
            className="btn btn-primary" 
            onClick={() => { 
              resetForm(); 
              setShowUserModal(true); 
            }}
          >
            <UserPlus size={16} style={{ marginRight: '0.4rem' }} />
            Thêm User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="user-search-container">
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            className="user-search-input"
            placeholder="Tìm kiếm theo email, họ tên, số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <UserPlus size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <div>Chưa có thành viên bàn phím. Nhấn <strong>Thêm User</strong> để tạo.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>User / Tài khoản</th>
                <th style={{ padding: '1rem' }}>SĐT</th>
                <th style={{ padding: '1rem' }}>Gói hiện tại</th>
                <th style={{ padding: '1rem' }}>AI Credit hôm nay</th>
                <th style={{ padding: '1rem' }}>TK</th>
                {!isSale && <th style={{ padding: '1rem' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const latestSub = u.subscriptions?.[0];
                const hasActiveSub = latestSub?.status === 'active';
                const isLocked = u.status === 'locked';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td data-label="Tài khoản" style={{ padding: '1rem' }}>
                      <div className="user-info-cell">
                        <div style={{ fontWeight: 500 }}>{u.name || 'Chưa cập nhật'}</div>
                        {isLocked && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>LOCKED</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td data-label="SĐT" style={{ padding: '1rem' }}>{u.phone || '—'}</td>
                    <td data-label="Gói hiện tại" style={{ padding: '1rem' }}>
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
                    <td data-label="AI Credit" style={{ padding: '1rem' }}>
                      {renderAiQuota(u)}
                    </td>
                    <td data-label="Trạng thái" style={{ padding: '1rem' }}>
                      <span className={`badge ${!isLocked ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {isLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </td>
                    {!isSale && (
                      <td data-label="Thao tác" style={{ padding: '1rem' }}>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
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
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo tài khoản USER bàn phím */}
      {showUserModal && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="modal-user-title"
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowUserModal(false); }}
        >
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <UserPlus size={22} color="var(--primary)" />
              <h3 id="modal-user-title" style={{ margin: 0 }}>Thêm Người dùng mới</h3>
            </div>
            <form onSubmit={handleCreateUser} className="flex-col gap-4">
              <div>
                <label htmlFor="user-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Họ và tên</label>
                <input id="user-name" type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="user-phone" style={{ display: 'block', marginBottom: '0.25rem' }}>Số điện thoại</label>
                <input id="user-phone" type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="user-email" style={{ display: 'block', marginBottom: '0.25rem' }}>Username / tài khoản <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="user-email" type="text" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="vd: sale01 hoặc 0901234567"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label htmlFor="user-pass" style={{ display: 'block', marginBottom: '0.25rem' }}>Mật khẩu khởi tạo <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="user-pass" type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
              {!isSale && (
                <div>
                  <label htmlFor="account-role" style={{ display: 'block', marginBottom: '0.25rem' }}>Loại tài khoản</label>
                  <select
                    id="account-role"
                    value={accountRole}
                    onChange={e => setAccountRole(e.target.value as 'USER' | 'SALE')}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="USER">User bàn phím</option>
                    <option value="SALE">Sale</option>
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="user-plan" style={{ display: 'block', marginBottom: '0.25rem' }}>Gói kích hoạt ban đầu</label>
                <select
                  id="user-plan"
                  value={selectedPlanId}
                  onChange={e => {
                    const nextPlanId = e.target.value;
                    setSelectedPlanId(nextPlanId);
                    const nextPlan = plans.find((plan) => plan.id === nextPlanId);
                    setDurationDays(nextPlan ? parseDefaultDuration(nextPlan.features) : 30);
                  }}
                  disabled={accountRole !== 'USER'}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">Không gán gói</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price.toLocaleString('vi-VN')}đ - AI {parseAiLimit(plan.features)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="user-duration" style={{ display: 'block', marginBottom: '0.25rem' }}>Thời hạn gói (ngày)</label>
                <input
                  id="user-duration"
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  disabled={!selectedPlanId || accountRole !== 'USER'}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--surface-bg)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--primary)' }}>
                {accountRole === 'SALE' ? (
                  <>Tài khoản <strong>SALE</strong> chỉ được tạo user bàn phím, bán gói và xem doanh thu của chính mình.</>
                ) : selectedPlan ? (
                  <>
                    Tài khoản tạo mới là <strong>USER bàn phím</strong>. Hệ thống sẽ cấp gói <strong>{selectedPlan.name}</strong>, hạn mức AI <strong>{parseAiLimit(selectedPlan.features)} lượt/ngày</strong>, và tự ghi nhận <strong>{projectedRevenue.toLocaleString('vi-VN')}đ</strong> vào doanh thu thủ công.
                  </>
                ) : (
                  <>Tài khoản tạo mới là <strong>USER bàn phím</strong>. Không gán gói thì không ghi nhận doanh thu, user dùng hạn mức mặc định 5 lượt AI/ngày.</>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowUserModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : '✅ Tạo người dùng'}
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
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) { setShowCreditModal(false); setCreditTarget(null); }}}
        >
          <div className="modal-card">
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
