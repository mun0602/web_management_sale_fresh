"use client";

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRefundModal(false);
      }
    };
    if (showRefundModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRefundModal]);

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Chế độ Demo: Tính năng hoàn tiền bị khóa.');
  };

  return (
    <div className="payments-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Giao dịch (Payments)</h1>
          <p>Lịch sử thanh toán từ In-App Purchase (Apple/Google)</p>
        </div>
        <button className="btn btn-outline" onClick={() => toast.error('Chế độ Demo: Tính năng export bị khóa.')}>
          <Download size={18} style={{ marginRight: '0.5rem' }} /> Export Data
        </button>
      </div>

      <div className="glass-panel mb-6 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2" style={{ background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', flex: 1 }}>
            <Search size={18} color="var(--text-secondary)" />
            <input type="text" placeholder="Tìm Transaction ID, email..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
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
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td style={{ padding: '1rem', fontFamily: 'monospace' }}>TX_APL_987654321</td>
              <td style={{ padding: '1rem' }}>nguyenvana@gmail.com</td>
              <td style={{ padding: '1rem' }}>Pro 1 Tháng</td>
              <td style={{ padding: '1rem', fontWeight: 600 }}>99.000</td>
              <td style={{ padding: '1rem' }}>Apple App Store</td>
              <td style={{ padding: '1rem' }}><span className="badge badge-success">Succeed</span></td>
              <td style={{ padding: '1rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setShowRefundModal(true)} title="Refund" aria-label="Hoàn tiền giao dịch">
                  <RotateCcw size={14} /> Refund
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showRefundModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="modal-title" style={{ marginTop: 0, color: 'var(--danger)' }}>Xác nhận Hoàn tiền (Refund)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Hành động này sẽ gửi lệnh Refund lên Apple/Google và thu hồi gói cước của người dùng.</p>
            <form onSubmit={handleRefund} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="refund-reason-input" style={{ display: 'block', marginBottom: '0.5rem' }}>Lý do hoàn tiền</label>
                <textarea 
                  id="refund-reason-input"
                  required 
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '80px' }} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowRefundModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)' }} disabled>Xác nhận Refund (Bị khóa trong Demo)</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
