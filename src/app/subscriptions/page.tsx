"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Ban, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi } from '@/api/subscriptions';
import { plansApi } from '@/api/plans';

interface Subscription {
  id: string;
  userId: string;
  user: {
    email: string;
    name: string | null;
  };
  planId: string;
  plan: {
    name: string;
    price: number;
  };
  status: string;
  startDate: string;
  endDate: string;
}

interface Plan {
  id: string;
  name: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal cấp thuê bao thủ công
  const [showAddModal, setShowAddModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await subscriptionsApi.getSubscriptions({
        q: searchQuery,
        status: statusFilter
      });
      setSubscriptions((response.data as unknown as Subscription[]) || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải danh sách thuê bao';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const fetchPlans = async () => {
    try {
      const response = await plansApi.getPlans();
      const plansList = (response.data as unknown as Plan[]) || [];
      setPlans(plansList);
      if (plansList.length > 0) {
        setSelectedPlanId(plansList[0].id);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchPlans();
  }, []);

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

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await subscriptionsApi.createSubscription({
        email: userEmail,
        planId: selectedPlanId,
        durationDays: Number(durationDays),
      });
      toast.success('Kích hoạt thuê bao thủ công thành công!');
      setShowAddModal(false);
      setUserEmail('');
      fetchSubscriptions();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi kích hoạt thuê bao.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubscription = async (id: string) => {
    const daysStr = prompt('Nhập số ngày muốn cộng thêm (hoặc nhập số âm để trừ):', '30');
    if (daysStr === null) return;
    const days = Number(daysStr);
    if (isNaN(days) || days === 0) {
      toast.error('Số ngày không hợp lệ');
      return;
    }
    try {
      await subscriptionsApi.adjustSubscription(id, { durationDays: days });
      toast.success(`Đã gia hạn thuê bao thêm ${days} ngày`);
      fetchSubscriptions();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi điều chỉnh thuê bao.';
      toast.error(msg);
    }
  };

  const handleCancelSubscription = async (id: string) => {
    const reason = prompt('Nhập lý do hủy thuê bao:', 'Khách hàng yêu cầu hủy');
    if (reason === null) return;
    try {
      await subscriptionsApi.cancelSubscription(id, reason);
      toast.success('Đã hủy thuê bao thành công');
      fetchSubscriptions();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi hủy thuê bao.';
      toast.error(msg);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Quản lý Thuê bao (Subscriptions)</h1>
          <p>Xem trạng thái gói cước, gia hạn, nâng hạ gói của khách hàng thực tế</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Cấp thuê bao thủ công
        </button>
      </div>

      <div className="glass-card mb-4 flex gap-4">
        <div className="flex items-center gap-2" style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Tìm theo email, tên khách hàng..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }} 
          />
        </div>
        <select 
          className="btn btn-outline" 
          style={{ background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách thuê bao...</div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy thuê bao nào.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Gói dịch vụ</th>
                <th>Trạng thái</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const isActive = sub.status === 'active';
                return (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{sub.user.name || 'Chưa cập nhật'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.user.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{sub.plan.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.plan.price.toLocaleString('vi-VN')} ₫</div>
                    </td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-success' : sub.status === 'cancelled' ? 'badge-warning' : 'badge-danger'}`}>
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatDate(sub.startDate)}</td>
                    <td>{formatDate(sub.endDate)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          onClick={() => handleAdjustSubscription(sub.id)}
                          title="Gia hạn thủ công"
                        >
                          Gia hạn
                        </button>
                        {isActive && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                            onClick={() => handleCancelSubscription(sub.id)}
                            title="Hủy kích hoạt"
                          >
                            <Ban size={14} style={{ marginRight: '0.25rem' }} /> Hủy
                          </button>
                        )}
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
            <h3 id="modal-title" style={{ marginTop: 0 }}>Cấp Thuê bao thủ công</h3>
            <form onSubmit={handleCreateSubscription} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="user-email-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Email khách hàng</label>
                <input 
                  id="user-email-input"
                  type="email" 
                  required 
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="e.g. nguyenvana@gmail.com"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="plan-select" style={{ display: 'block', marginBottom: '0.25rem' }}>Gói dịch vụ</label>
                <select 
                  id="plan-select"
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="duration-days" style={{ display: 'block', marginBottom: '0.25rem' }}>Thời hạn sử dụng (ngày)</label>
                <input 
                  id="duration-days"
                  type="number" 
                  required 
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang kích hoạt...' : 'Kích hoạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
