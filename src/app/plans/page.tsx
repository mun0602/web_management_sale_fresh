"use client";

import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { plansApi } from '@/api/plans';

interface Plan {
  id: string;
  name: string;
  price: number;
  appleId: string | null;
  googleId: string | null;
  features: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [appleId, setAppleId] = useState('');
  const [googleId, setGoogleId] = useState('');
  const [features, setFeatures] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await plansApi.getPlans();
      setPlans((response.data as unknown as Plan[]) || []);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi tải danh sách gói cước';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

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

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await plansApi.createPlan({
        name: planName,
        price: Number(planPrice),
        appleId: appleId || null,
        googleId: googleId || null,
        features: features,
      });
      toast.success(`Đã tạo gói cước "${planName}" thành công.`);
      setShowAddModal(false);
      // Reset form
      setPlanName('');
      setPlanPrice(0);
      setAppleId('');
      setGoogleId('');
      setFeatures('');
      fetchPlans();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi lưu gói cước.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa gói cước "${name}"?`)) {
      return;
    }
    try {
      await plansApi.deletePlan(id);
      toast.success('Xóa gói cước thành công');
      fetchPlans();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Lỗi khi xóa gói cước.';
      toast.error(msg);
    }
  };

  const subscriptionPlans = plans.filter((p) => !p.id.startsWith('addon'));
  const addonPlans = plans.filter((p) => p.id.startsWith('addon'));

  /** Parse features string thành object hiển thị */
  function parseFeatures(features: string): { displayList: string[]; aiLimit: number | 'unlimited'; aiAddon: number } {
    const parts = (features || '').split(',').map(f => f.trim()).filter(Boolean);
    let aiLimit: number | 'unlimited' = 5;
    let aiAddon = 0;
    const displayList: string[] = [];

    for (const f of parts) {
      if (f === 'ai_unlimited') { aiLimit = 'unlimited'; continue; }
      if (f.startsWith('ai_limit:')) { aiLimit = parseInt(f.slice(9)) || 5; continue; }
      if (f.startsWith('ai_addon:')) { aiAddon = parseInt(f.slice(9)) || 0; continue; }
      displayList.push(f);
    }
    return { displayList, aiLimit, aiAddon };
  }

  return (
    <div className="plans-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ marginBottom: 0 }}>Gói dịch vụ (Plans)</h1>
          <p>Quản lý các gói thuê bao chính và gói mua thêm lượt AI thực tế trong hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Thêm gói mới
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải các gói cước...</div>
      ) : plans.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có gói cước nào. Hãy thêm gói mới.</div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Section 1: Gói thuê bao định kỳ */}
          {subscriptionPlans.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--primary)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
                <Package size={20} /> Gói Thuê Bao Định Kỳ (Subscription Plans)
              </h2>
              <div className="dashboard-grid">
                {subscriptionPlans.map((p) => {
                  const { displayList, aiLimit, aiAddon } = parseFeatures(p.features);
                  return (
                    <div key={p.id} className="glass-card plan-card" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.25rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          title="Xóa"
                          onClick={() => handleDeletePlan(p.id, p.name)}
                          aria-label="Xóa gói cước"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Package size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                      <h3>{p.name}</h3>
                      <div className="price">
                        {p.price.toLocaleString('vi-VN')} ₫
                      </div>
                      {/* AI Limit Badge */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        {aiLimit === 'unlimited' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                            🤖 Không giới hạn AI
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                            🤖 {aiLimit} lượt AI/ngày
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>App Store: {p.appleId || '-'}</span>
                        <span>Google Play: {p.googleId || '-'}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                        {displayList.map((f, index) => (
                          <li key={index} style={{ padding: '0.5rem 0', borderBottom: index < displayList.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                            ✓ {f.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Gói mua thêm lượt AI */}
          {addonPlans.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--sidebar-ring)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
                <Zap size={20} /> Gói Mua Thêm Lượt AI (Add-on AI Quota)
              </h2>
              <div className="dashboard-grid">
                {addonPlans.map((p) => {
                  const { displayList, aiAddon } = parseFeatures(p.features);
                  return (
                    <div key={p.id} className="glass-card plan-card" style={{ position: 'relative', borderLeft: '4px solid var(--sidebar-ring)' }}>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.25rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          title="Xóa"
                          onClick={() => handleDeletePlan(p.id, p.name)}
                          aria-label="Xóa gói cước"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Zap size={32} color="var(--sidebar-ring)" style={{ marginBottom: '1rem' }} />
                      <h3>{p.name}</h3>
                      <div className="price" style={{ color: 'var(--sidebar-ring)' }}>
                        {p.price.toLocaleString('vi-VN')} ₫
                      </div>
                      {aiAddon > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                            ⚡ +{aiAddon} lượt AI
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>App Store: {p.appleId || '-'}</span>
                        <span>Google Play: {p.googleId || '-'}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                        {displayList.map((f, index) => (
                          <li key={index} style={{ padding: '0.5rem 0', borderBottom: index < displayList.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                            ⚡ {f.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="glass-card" style={{ width: 400, padding: '2rem' }}>
            <h3 id="modal-title" style={{ marginTop: 0 }}>Thêm Gói dịch vụ mới</h3>
            <form onSubmit={handleAddPlan} className="flex-col gap-4 mt-4">
              <div>
                <label htmlFor="plan-name-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Tên gói</label>
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
                <label htmlFor="plan-price-input" style={{ display: 'block', marginBottom: '0.25rem' }}>Giá (VNĐ)</label>
                <input 
                  id="plan-price-input"
                  type="number" 
                  required 
                  value={planPrice}
                  onChange={e => setPlanPrice(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="plan-apple-id" style={{ display: 'block', marginBottom: '0.25rem' }}>Apple App Store Product ID</label>
                <input 
                  id="plan-apple-id"
                  type="text" 
                  value={appleId}
                  onChange={e => setAppleId(e.target.value)}
                  placeholder="e.g. com.company.pro.1m"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="plan-google-id" style={{ display: 'block', marginBottom: '0.25rem' }}>Google Play Product ID</label>
                <input 
                  id="plan-google-id"
                  type="text" 
                  value={googleId}
                  onChange={e => setGoogleId(e.target.value)}
                  placeholder="e.g. com.company.pro.1m"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                />
              </div>
              <div>
                <label htmlFor="plan-features" style={{ display: 'block', marginBottom: '0.25rem' }}>Các tính năng (Ngăn cách bằng dấu phẩy)</label>
                <textarea 
                  id="plan-features"
                  required 
                  value={features}
                  onChange={e => setFeatures(e.target.value)}
                  placeholder="e.g. 1 Thiết bị,Lọc tin nhắn AI,Không giới hạn tính năng"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '80px' }} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo gói'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
