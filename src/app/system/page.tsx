"use client";

import React from 'react';
import { Settings, Server, Database, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SystemPage() {
  const handleClearCache = () => {
    toast.error('Chế độ Demo: Tính năng xóa bộ nhớ đệm bị vô hiệu hóa.');
  };

  const handleRestartService = () => {
    toast.error('Chế độ Demo: Tính năng khởi động lại máy chủ bị vô hiệu hóa.');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Thiết lập Hệ thống</h1>
          <p>Giám sát tình trạng máy chủ và cấu hình kỹ thuật</p>
        </div>
        <button className="btn btn-primary" disabled>
          Lưu thay đổi (Bị khóa trong Demo)
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <h3 className="flex items-center gap-2 mb-4"><Server size={20} color="var(--primary)" /> Trạng thái Server</h3>
          <div className="flex-col gap-2 mb-4">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>CPU Usage:</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>12%</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>RAM Usage:</span>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>68% (1.4GB)</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span>
              <span>12 days, 4 hours</span>
            </div>
          </div>
          <button className="btn btn-outline w-full" onClick={handleRestartService} style={{ width: '100%' }}>
            <RefreshCw size={16} /> Khởi động lại Server
          </button>
        </div>

        <div className="glass-card">
          <h3 className="flex items-center gap-2 mb-4"><Database size={20} color="var(--primary)" /> Database (Supabase)</h3>
          <div className="flex-col gap-2 mb-4">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Connection:</span>
              <span className="badge badge-success">Healthy</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Storage Used:</span>
              <span>4.2 GB / 50 GB</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Active Connections:</span>
              <span>32</span>
            </div>
          </div>
          <button className="btn btn-outline w-full" onClick={handleClearCache} style={{ width: '100%' }}>
            <RefreshCw size={16} /> Xóa Cache DB
          </button>
        </div>

        <div className="glass-card">
          <h3 className="flex items-center gap-2 mb-4"><Settings size={20} color="var(--primary)" /> Tham số cấu hình</h3>
          <div className="flex-col gap-4">
            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Bảo trì hệ thống (Maintenance Mode)</label>
              <select className="btn btn-outline" style={{ background: 'var(--bg-color)', width: '100%' }}>
                <option>Tắt (Hoạt động bình thường)</option>
                <option>Bật (Chỉ Admin truy cập)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Mức độ Log (Log Level)</label>
              <select className="btn btn-outline" style={{ background: 'var(--bg-color)', width: '100%' }}>
                <option>INFO</option>
                <option>WARN</option>
                <option>ERROR</option>
                <option>DEBUG</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
