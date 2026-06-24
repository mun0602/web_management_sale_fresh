"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { auditApi } from '@/api/audit';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target: string | null;
  details: string | null;
  ip: string | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditApi.getAuditLogs({
        q: searchQuery
      });
      setLogs((response.data as unknown as AuditLog[]) || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải nhật ký hoạt động';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getBadgeClass = (action: string) => {
    if (action.includes('CREATE')) return 'badge-success';
    if (action.includes('DELETE')) return 'badge-danger';
    if (action.includes('UPDATE')) return 'badge-warning';
    return 'badge-primary';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Nhật ký Audit</h1>
          <p>Lịch sử thao tác hệ thống, thay đổi gói cước, đăng nhập của Admin thực tế trong database</p>
        </div>
      </div>

      <div className="glass-card mb-4 flex gap-4">
        <div className="flex items-center gap-2" style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Tìm theo hành động, email admin, đối tượng hoặc nội dung chi tiết..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }} 
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải nhật ký...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy bản ghi nhật ký nào.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Thời gian (Local)</th>
                <th>Hành động</th>
                <th>Actor (Admin)</th>
                <th>Đối tượng</th>
                <th>Chi tiết thay đổi</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTime(log.timestamp)}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.actor}</td>
                  <td>{log.target || '-'}</td>
                  <td style={{ fontSize: '0.875rem', maxWidth: '300px', wordBreak: 'break-word' }}>{log.details || '-'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
