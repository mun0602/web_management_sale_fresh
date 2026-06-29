"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Search, Users, CreditCard, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardApi } from '@/api/dashboard';

interface SaleRevenueRow {
  sale: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: string;
  };
  userCount: number;
  activeSubscriptions: number;
  paymentCount: number;
  grossRevenue: number;
  refund: number;
  netRevenue: number;
}

function getPeriodDates(periodStr: string) {
  const to = new Date();
  const from = new Date();

  if (periodStr === '7 ngày qua') {
    from.setDate(to.getDate() - 7);
  } else if (periodStr === '30 ngày qua') {
    from.setDate(to.getDate() - 30);
  } else if (periodStr === 'Tháng này') {
    from.setDate(1);
  } else if (periodStr === 'Tháng trước') {
    from.setMonth(to.getMonth() - 1);
    from.setDate(1);
    to.setTime(new Date(to.getFullYear(), to.getMonth() + 1, 0).getTime());
  }

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { from: formatDate(from), to: formatDate(to) };
}

export default function SalesRevenuePage() {
  const [rows, setRows] = useState<SaleRevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30 ngày qua');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getPeriodDates(period);
      const response = await dashboardApi.getSalesRevenue({ from, to, q: searchQuery });
      setRows((response.data as SaleRevenueRow[]) || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Lỗi khi tải doanh thu sale');
    } finally {
      setLoading(false);
    }
  }, [period, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchRows, 300);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  const totals = rows.reduce(
    (acc, row) => ({
      users: acc.users + row.userCount,
      subs: acc.subs + row.activeSubscriptions,
      payments: acc.payments + row.paymentCount,
      revenue: acc.revenue + row.netRevenue,
    }),
    { users: 0, subs: 0, payments: 0, revenue: 0 }
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Doanh thu theo Sale</h1>
          <p>Thống kê user, thuê bao và doanh thu thủ công theo từng tài khoản sale</p>
        </div>
        <select
          className="btn btn-outline"
          style={{ background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
          value={period}
          onChange={e => setPeriod(e.target.value)}
        >
          <option>7 ngày qua</option>
          <option>30 ngày qua</option>
          <option>Tháng này</option>
          <option>Tháng trước</option>
        </select>
      </div>

      <div className="dashboard-grid mb-6">
        <div className="glass-card kpi-card">
          <div className="kpi-title"><DollarSign size={18} color="var(--primary)" /> Net Revenue</div>
          <div className="kpi-value">{totals.revenue.toLocaleString('vi-VN')} ₫</div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-title"><Users size={18} color="var(--primary)" /> User đã tạo</div>
          <div className="kpi-value">{totals.users}</div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-title"><CreditCard size={18} color="var(--success)" /> Thuê bao active</div>
          <div className="kpi-value">{totals.subs}</div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-title"><BarChart3 size={18} color="var(--warning)" /> Giao dịch</div>
          <div className="kpi-value">{totals.payments}</div>
        </div>
      </div>

      <div className="glass-panel mb-6 p-4">
        <div className="flex items-center gap-2">
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Tìm sale theo tài khoản, họ tên, số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải doanh thu sale...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Chưa có tài khoản sale hoặc chưa có doanh thu trong kỳ này.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Sale</th>
                <th style={{ padding: '1rem' }}>User đã tạo</th>
                <th style={{ padding: '1rem' }}>Thuê bao active</th>
                <th style={{ padding: '1rem' }}>Giao dịch</th>
                <th style={{ padding: '1rem' }}>Gross</th>
                <th style={{ padding: '1rem' }}>Refund</th>
                <th style={{ padding: '1rem' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sale.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{row.sale.name || row.sale.email}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.sale.email}</div>
                    {row.sale.phone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{row.sale.phone}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>{row.userCount}</td>
                  <td style={{ padding: '1rem' }}>{row.activeSubscriptions}</td>
                  <td style={{ padding: '1rem' }}>{row.paymentCount}</td>
                  <td style={{ padding: '1rem' }}>{row.grossRevenue.toLocaleString('vi-VN')} ₫</td>
                  <td style={{ padding: '1rem', color: row.refund > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {row.refund.toLocaleString('vi-VN')} ₫
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                    {row.netRevenue.toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
