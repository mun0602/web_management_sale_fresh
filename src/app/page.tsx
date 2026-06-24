"use client";

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, CreditCard, Activity, ArrowDownRight, Percent, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { dashboardApi } from '@/api/dashboard';

interface DashboardSummary {
  netRevenue?: number;
  grossRevenue?: number;
  mrr?: number;
  refund?: number;
  activeUsers?: number;
  trialUsers?: number;
  activeSubscriptions?: number;
  arpu?: number;
}

interface RevenueChartData {
  name: string;
  revenue: number;
}

export default function Dashboard() {
  const [period, setPeriod] = useState('30 ngày qua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<RevenueChartData[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [summary, timeseries] = await Promise.all([
          dashboardApi.getSummary({ from: '2026-05-25', to: '2026-06-25', timezone: 'Asia/Ho_Chi_Minh' }),
          dashboardApi.getRevenueTimeseries({ from: '2026-05-25', to: '2026-06-25', interval: 'day' })
        ]);
        
        setSummaryData(summary.data as DashboardSummary);
        setChartData((timeseries.data as RevenueChartData[]) || []);
      } catch (err) {
        const errorResponse = err as { response?: { data?: { error?: { message?: string } } } };
        setError(errorResponse.response?.data?.error?.message || 'Không thể tải dữ liệu Dashboard. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="dashboard-container flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <Activity className="animate-spin" size={32} color="var(--primary)" />
        <span className="ml-3">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="flex-col items-center justify-center text-center p-12 glass-card">
          <AlertCircle size={48} color="var(--danger)" className="mb-4" />
          <h3 className="mb-2">Lỗi tải dữ liệu</h3>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => setPeriod(period)}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Tổng quan (Dashboard)</h1>
          <p>KPI và báo cáo tài chính (Timezone: Asia/Ho_Chi_Minh)</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="btn btn-outline" 
            style={{ background: 'var(--surface-bg)' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>7 ngày qua</option>
            <option>30 ngày qua</option>
            <option>Tháng này</option>
            <option>Tháng trước</option>
          </select>
          <button className="btn btn-primary" onClick={() => toast.error('Tính năng xuất báo cáo yêu cầu phân quyền FINANCE.')}>
            Xuất báo cáo
          </button>
        </div>
      </div>
      
      {!summaryData ? (
        <div className="glass-card text-center p-8">Chưa có dữ liệu thống kê cho khoảng thời gian này.</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="glass-card kpi-card">
              <div className="kpi-title"><DollarSign size={18} color="var(--primary)" /> Net Collected Revenue</div>
              <div className="kpi-value">{(summaryData?.netRevenue || 0).toLocaleString('vi-VN')} ₫</div>
            </div>
            
            <div className="glass-card kpi-card">
              <div className="kpi-title"><DollarSign size={18} color="var(--success)" /> Gross Collected Revenue</div>
              <div className="kpi-value">{(summaryData?.grossRevenue || 0).toLocaleString('vi-VN')} ₫</div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-title"><Activity size={18} color="var(--primary)" /> MRR</div>
              <div className="kpi-value">{(summaryData?.mrr || 0).toLocaleString('vi-VN')} ₫</div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-title"><ArrowDownRight size={18} color="var(--danger)" /> Refund</div>
              <div className="kpi-value">{(summaryData?.refund || 0).toLocaleString('vi-VN')} ₫</div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-title"><Users size={18} color="var(--primary)" /> Active Users (30d)</div>
              <div className="kpi-value">{summaryData?.activeUsers || 0}</div>
            </div>
            
            <div className="glass-card kpi-card">
              <div className="kpi-title"><Users size={18} color="var(--warning)" /> Đang Trial</div>
              <div className="kpi-value">{summaryData?.trialUsers || 0}</div>
            </div>
            
            <div className="glass-card kpi-card">
              <div className="kpi-title"><CreditCard size={18} color="var(--primary)" /> Active Subscriptions</div>
              <div className="kpi-value">{summaryData?.activeSubscriptions || 0}</div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-title"><Percent size={18} color="var(--primary)" /> ARPU</div>
              <div className="kpi-value">{(summaryData?.arpu || 0).toLocaleString('vi-VN')} ₫</div>
            </div>
          </div>
          
          <div className="flex gap-8 mt-4" style={{ flexWrap: 'wrap' }}>
            <div className="glass-card" style={{ flex: '1 1 60%' }}>
              <h3 className="mb-4">Biểu đồ Doanh thu (VNĐ)</h3>
              <div style={{ height: '300px', width: '100%' }}>
                {chartData.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-sm" style={{ color: 'var(--text-secondary)' }}>Không có dữ liệu biểu đồ</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-border)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(value) => `${value / 1000000}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
                        formatter={(value: unknown) => [`${Number(value as number).toLocaleString('vi-VN')} ₫`, 'Doanh thu']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
