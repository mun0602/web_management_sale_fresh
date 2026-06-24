"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api/payments';

interface Payment {
  id: string;
  transactionId: string;
  userId: string;
  user: {
    email: string;
  };
  productName: string;
  amount: number;
  platform: string;
  status: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal hoàn tiền
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Modal tạo giao dịch thủ công
  const [showAddModal, setShowAddModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [amount, setAmount] = useState(99000);
  const [productName, setProductName] = useState('Pro (1 tháng)');
  const [platform, setPlatform] = useState('Stripe');
  const [transactionId, setTransactionId] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentsApi.getPayments({
        q: searchQuery,
        status: statusFilter
      });
      setPayments((response.data as unknown as Payment[]) || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải danh sách giao dịch';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRefundModal(false);
        setShowAddModal(false);
      }
    };
    if (showRefundModal || showAddModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRefundModal, showAddModal]);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setRefundSubmitting(true);
    try {
      await paymentsApi.refundPayment(selectedPayment.id, { reason: refundReason });
      toast.success(`Đã hoàn tiền thành công cho giao dịch ${selectedPayment.transactionId}`);
      setShowRefundModal(false);
      setRefundReason('');
      setSelectedPayment(null);
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi hoàn tiền giao dịch.';
      toast.error(msg);
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      await paymentsApi.createPayment({
        email: userEmail,
        amount: Number(amount),
        productName,
        platform,
        transactionId,
      });
      toast.success('Đã thêm giao dịch thủ công thành công!');
      setShowAddModal(false);
      setUserEmail('');
      setTransactionId('');
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tạo giao dịch.';
      toast.error(msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="payments-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Giao dịch (Payments)</h1>
          <p>Lịch sử thanh toán thực tế từ hệ thống (Apple Store, Google Play, Stripe, Chuyển khoản)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Thêm giao dịch thủ công
        </button>
      </div>

      <div className="glass-panel mb-6 p-4 flex gap-4">
        <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Tìm theo mã giao dịch, email khách hàng, tên sản phẩm..." 
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
          <option value="succeeded">Succeed</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách giao dịch...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy giao dịch nào.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Thời gian</th>
                <th style={{ padding: '1rem' }}>Transaction ID</th>
                <th style={{ padding: '1rem' }}>Người dùng</th>
                <th style={{ padding: '1rem' }}>Sản phẩm</th>
                <th style={{ padding: '1rem' }}>Số tiền (VND)</th>
                <th style={{ padding: '1rem' }}>Platform</th>
                <th style={{ padding: '1rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const isSucceeded = p.status === 'succeeded';
                const isRefunded = p.status === 'refunded';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formatDate(p.createdAt)}
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{p.transactionId}</td>
                    <td style={{ padding: '1rem' }}>{p.user.email}</td>
                    <td style={{ padding: '1rem' }}>{p.productName}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{p.amount.toLocaleString('vi-VN')} ₫</td>
                    <td style={{ padding: '1rem' }}>{p.platform}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${isSucceeded ? 'badge-success' : isRefunded ? 'badge-warning' : 'badge-danger'}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isSucceeded && (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                          onClick={() => {
                            setSelectedPayment(p);
                            setShowRefundModal(true);
                          }} 
                          title="Refund" 
                          aria-label="Hoàn tiền giao dịch"
                        >
                          <RotateCcw size={14} style={{ marginRight: '0.25rem' }} /> Refund
                        </button>
                      )}
                      {isRefunded && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                          <Check size={14} style={{ marginRight: '0.25rem' }} /> Đã hoàn tiền
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Hoàn tiền */}
      {showRefundModal && selectedPayment && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="refund-modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="refund-modal-title" style={{ marginTop: 0, color: 'var(--danger)' }}>Xác nhận Hoàn tiền (Refund)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Hành động này sẽ cập nhật trạng thái giao dịch <strong>{selectedPayment.transactionId}</strong> của người dùng <strong>{selectedPayment.user.email}</strong> thành HOÀN TIỀN (Refund).
            </p>
            <form onSubmit={handleRefund} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="refund-reason-input" style={{ display: 'block', marginBottom: '0.5rem' }}>Lý do hoàn tiền</label>
                <textarea 
                  id="refund-reason-input"
                  required 
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Khách hàng yêu cầu hoàn tiền do mua nhầm gói"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '80px' }} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowRefundModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)' }} disabled={refundSubmitting}>
                  {refundSubmitting ? 'Đang xử lý...' : 'Xác nhận Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm giao dịch thủ công */}
      {showAddModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="add-modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="add-modal-title" style={{ marginTop: 0 }}>Ghi nhận giao dịch thủ công</h3>
            <form onSubmit={handleCreatePayment} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="customer-email" style={{ display: 'block', marginBottom: '0.25rem' }}>Email khách hàng</label>
                <input 
                  id="customer-email"
                  type="email" 
                  required 
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="e.g. nguyenvana@gmail.com"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="transaction-id" style={{ display: 'block', marginBottom: '0.25rem' }}>Mã giao dịch (Transaction ID)</label>
                <input 
                  id="transaction-id"
                  type="text" 
                  required 
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="e.g. TX_BANK_123456"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="product-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Tên gói / sản phẩm</label>
                <input 
                  id="product-name"
                  type="text" 
                  required 
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="amount" style={{ display: 'block', marginBottom: '0.25rem' }}>Số tiền thanh toán (VNĐ)</label>
                <input 
                  id="amount"
                  type="number" 
                  required 
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="platform-select" style={{ display: 'block', marginBottom: '0.25rem' }}>Cổng thanh toán (Platform)</label>
                <select 
                  id="platform-select"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                >
                  <option value="Stripe">Stripe</option>
                  <option value="Apple App Store">Apple App Store</option>
                  <option value="Google Play">Google Play</option>
                  <option value="Bank Transfer">Bank Transfer (Chuyển khoản)</option>
                  <option value="Cash">Cash (Tiền mặt)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={addSubmitting}>
                  {addSubmitting ? 'Đang ghi nhận...' : 'Ghi nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
