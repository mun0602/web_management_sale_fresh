"use client";

import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [planName, setPlanName] = useState('');

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

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Chế độ Demo: Tính năng thêm gói cước bị khóa.');
  };

  return (
    <div className="plans-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Gói dịch vụ (Plans)</h1>
          <p>Quản lý các gói thuê bao (Pricing & Duration)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Thêm gói mới
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card plan-card" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.25rem' }} title="Sửa" onClick={() => toast.error('Chế độ Demo: Tính năng sửa gói cước bị khóa.')} aria-label="Sửa gói cước"><Edit2 size={16} /></button>
            <button className="btn btn-outline" style={{ padding: '0.25rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Xóa" onClick={() => toast.error('Chế độ Demo: Tính năng xóa gói cước bị khóa.')} aria-label="Xóa gói cước"><Trash2 size={16} /></button>
          </div>
          <Package size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3>Basic</h3>
          <div className="price">99.000 ₫ <span>/ tháng</span></div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Mã Apple: basic_1m</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface-border)' }}>✓ 1 Thiết bị</li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface-border)' }}>✓ Lọc tin nhắn AI</li>
            <li style={{ padding: '0.5rem 0' }}>✗ Không có quản lý nhóm</li>
          </ul>
        </div>
        {/* Mock other plans ... */}
      </div>

      {showAddModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="modal-title" style={{ marginTop: 0 }}>Thêm Gói dịch vụ</h3>
            <form onSubmit={handleAddPlan} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="plan-name-input" style={{ display: 'block', marginBottom: '0.5rem' }}>Tên gói</label>
                <input 
                  id="plan-name-input"
                  type="text" 
                  required 
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="plan-price-input" style={{ display: 'block', marginBottom: '0.5rem' }}>Giá (VNĐ)</label>
                <input 
                  id="plan-price-input"
                  type="number" 
                  required 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled>Lưu (Bị khóa trong Demo)</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
