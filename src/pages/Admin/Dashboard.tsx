import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users, ShoppingBag, BarChart3, Settings, LogOut, MessageSquare } from 'lucide-react';
import DealerOverview from '../../components/Admin/DealerOverview';
import OrderManager from '../../components/Admin/OrderManager';
import ProductCRUD from '../../components/Admin/ProductCRUD';
import AdminChat from '../../components/Admin/AdminChat';
import Analytics from '../../components/Admin/Analytics';

const AdminDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'dealers' | 'orders' | 'products' | 'chat' | 'analytics'>('analytics');

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <div style={{
                width: '260px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '30px 20px',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'linear-gradient(45deg, var(--accent), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <BarChart3 color="#fff" size={24} />
                    </div>
                    <h2 className="gradient-text">ADMIN PANEL</h2>
                </div>

                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                >
                    <BarChart3 size={20} /> Analytics
                </button>

                <button
                    onClick={() => setActiveTab('dealers')}
                    className={`sidebar-btn ${activeTab === 'dealers' ? 'active' : ''}`}
                >
                    <Users size={20} /> Dealers
                </button>

                <button
                    onClick={() => setActiveTab('orders')}
                    className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
                >
                    <ShoppingBag size={20} /> Orders
                </button>

                <button
                    onClick={() => setActiveTab('products')}
                    className={`sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
                >
                    <Settings size={20} /> Products
                </button>

                <button
                    onClick={() => setActiveTab('chat')}
                    className={`sidebar-btn ${activeTab === 'chat' ? 'active' : ''}`}
                >
                    <MessageSquare size={20} /> Messages
                </button>

                <div style={{ marginTop: 'auto' }}>
                    <button onClick={signOut} className="sidebar-btn" style={{ color: 'var(--danger)' }}>
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{
                    padding: '24px 40px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem' }}>
                            {activeTab === 'analytics' && 'Performance Analytics'}
                            {activeTab === 'dealers' && 'Dealer Management'}
                            {activeTab === 'orders' && 'Order Oversight'}
                            {activeTab === 'products' && 'Inventory Control'}
                            {activeTab === 'chat' && 'Central Communication'}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 600 }}>{profile?.name}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>System Administrator</p>
                        </div>
                    </div>
                </header>

                <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                    {activeTab === 'analytics' && <Analytics />}
                    {activeTab === 'dealers' && <DealerOverview />}
                    {activeTab === 'orders' && <OrderManager />}
                    {activeTab === 'products' && <ProductCRUD />}
                    {activeTab === 'chat' && <AdminChat />}
                </main>
            </div>

            <style>{`
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .sidebar-btn:hover {
          background: var(--glass);
          color: var(--text-main);
        }
        .sidebar-btn.active {
          background: var(--glass);
          color: var(--primary);
          border: 1px solid var(--glass-border);
        }
      `}</style>
        </div>
    );
};

export default AdminDashboard;
