import React from 'react';
import { Filter } from 'lucide-react';

export default function AuditLogPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Nhật ký Audit</h1>
          <p>Lịch sử thao tác hệ thống, thay đổi gói cước, đăng nhập của Admin</p>
        </div>
        <button className="btn btn-outline"><Filter size={16} /> Bộ lọc</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Thời gian (UTC)</th>
              <th>Hành động</th>
              <th>Actor (Admin)</th>
              <th>Đối tượng</th>
              <th>Chi tiết thay đổi</th>
              <th>IP / Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'log-1', time: '2026-06-24 10:00:00', action: 'ADMIN_LOGIN', actor: 'SUPER_ADMIN', target: '-', detail: 'Đăng nhập thành công', ip: '192.168.1.1' },
              { id: 'log-2', time: '2026-06-24 10:15:20', action: 'UPDATE_PLAN', actor: 'SUPER_ADMIN', target: 'Plan #2', detail: 'Đổi giá từ 99k -> 109k', ip: '192.168.1.1' },
              { id: 'log-3', time: '2026-06-24 11:30:00', action: 'LOCK_USER', actor: 'SUPPORT', target: 'User #1002', detail: 'Vi phạm chính sách spam', ip: '10.0.0.5' },
            ].map((log) => (
              <tr key={log.id}>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{log.time}</td>
                <td><span className="badge badge-primary">{log.action}</span></td>
                <td style={{ fontWeight: 500 }}>{log.actor}</td>
                <td>{log.target}</td>
                <td style={{ fontSize: '0.875rem' }}>{log.detail}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


