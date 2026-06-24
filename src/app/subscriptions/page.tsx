import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Quản lý Thuê bao (Subscriptions)</h1>
          <p>Xem trạng thái gói cước, gia hạn, nâng hạ gói</p>
        </div>
      </div>

      <div className="glass-card mb-4 flex gap-4">
        <div className="flex items-center gap-2" style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" />
          <input type="text" placeholder="Tìm ID, Tên..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }} />
        </div>
        <select className="btn btn-outline" style={{ background: 'var(--surface-bg)' }}>
          <option>Tất cả trạng thái</option>
          <option>Active</option>
          <option>Trialing</option>
          <option>Past Due</option>
          <option>Canceled</option>
        </select>
        <button className="btn btn-outline"><Filter size={16} /> Lọc</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Thuê bao</th>
              <th>Khách hàng</th>
              <th>Gói</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map(i => (
              <tr key={i}>
                <td>#SUB-900{i}</td>
                <td>User {i}</td>
                <td>Premium 1Y</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>01/01/2026</td>
                <td>01/01/2027</td>
                <td><button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Chi tiết</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


