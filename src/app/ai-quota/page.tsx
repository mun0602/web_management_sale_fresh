"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Save, Activity, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function AiQuotaPage() {
  const [defaultLimit, setDefaultLimit] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/ai-quota');
      if (res.data.success) {
        setDefaultLimit(res.data.defaultLimit);
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải cấu hình AI Quota');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.post('/api/admin/ai-quota', { defaultLimit });
      if (res.data.success) {
        toast.success('Lưu cấu hình thành công!');
      } else {
        toast.error(res.data.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      toast.error('Lỗi khi kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-secondary">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ marginBottom: 0 }}>Cấu hình AI Quota</h1>
          <p>Quản lý hạn ngạch chung cho toàn hệ thống SaleKeyboard</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-title">
            <Zap size={18} color="var(--primary)" />
            Hạn mức mặc định (Free User)
          </div>
          <div className="kpi-value">{defaultLimit} lượt</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Giới hạn số lần AI mỗi ngày cho tài khoản không có gói cước
          </p>
        </div>
        
        <div className="glass-card kpi-card">
          <div className="kpi-title">
            <Activity size={18} color="var(--success)" />
            Quyền quản trị
          </div>
          <div className="kpi-value" style={{ fontSize: '1.2rem', color: 'var(--success)' }}>Không giới hạn (∞)</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Tài khoản ADMIN và SUPER_ADMIN luôn được bỏ qua kiểm tra Quota.
          </p>
        </div>
      </div>

      <div className="glass-card mt-4 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Brain size={24} color="var(--primary)" />
          <h2 style={{ marginBottom: 0 }}>Cài đặt chung</h2>
        </div>
        
        <div style={{ maxWidth: '400px' }}>
          <div className="mb-4">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Giới hạn gọi AI mặc định (Lượt/Ngày)
            </label>
            <input
              type="number"
              min={0}
              value={defaultLimit}
              onChange={(e) => setDefaultLimit(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Thay đổi này sẽ áp dụng ngay lập tức cho các User mới hoặc User hiện tại chưa gọi AI hôm nay.
            </p>
          </div>
          
          <button 
            className="btn btn-primary w-full mt-4" 
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}
