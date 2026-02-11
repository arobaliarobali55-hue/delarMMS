import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users, ShoppingBag, BarChart3, Settings, LogOut, MessageSquare, ChevronRight, User } from 'lucide-react';
import DealerOverview from '../../components/Admin/DealerOverview';
import OrderManager from '../../components/Admin/OrderManager';
import ProductCRUD from '../../components/Admin/ProductCRUD';
import AdminChat from '../../components/Admin/AdminChat';
import Analytics from '../../components/Admin/Analytics';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'dealers' | 'orders' | 'products' | 'chat' | 'analytics'>('analytics');

    const menuItems = [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'dealers', label: 'Dealers', icon: Users },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'products', label: 'Inventory', icon: Settings },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
                width: '280px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '32px 24px',
                background: 'linear-gradient(180deg, rgba(18, 18, 20, 0.5), rgba(7, 7, 8, 0.5))',
                backdropFilter: 'blur(20px)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px', padding: '0 8px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(79, 172, 254, 0.2)'
                    }}>
                        <BarChart3 color="#fff" size={24} />
                    </div>
                    <div style={{ letterSpacing: '0.15em', fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>
                        PROTOCTOR
                        <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '-4px', fontWeight: 700 }}>ADMIN CONTROL</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                background: activeTab === item.id ? 'var(--glass)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeTab === item.id ? 'var(--border)' : 'transparent',
                                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: 'left',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{item.label}</span>
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="adminTabIndicator"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        width: '4px',
                                        height: '24px',
                                        borderRadius: '0 4px 4px 0',
                                        background: 'var(--primary)',
                                        boxShadow: '0 0 10px var(--primary)'
                                    }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={signOut}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)')}
                >
                    <LogOut size={20} />
                    <span style={{ fontWeight: 600 }}>Sign Out</span>
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <header style={{
                    padding: '24px 48px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(7, 7, 8, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid var(--border)',
                    zIndex: 5
                }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Admin <ChevronRight size={12} /> <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{activeTab}</span>
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                            {activeTab === 'analytics' && 'Performance Analytics'}
                            {activeTab === 'dealers' && 'Dealer Management'}
                            {activeTab === 'orders' && 'Order Oversight'}
                            {activeTab === 'products' && 'Inventory Control'}
                            {activeTab === 'chat' && 'Central Communication'}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 16px', background: 'var(--glass)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700 }}>Master Admin</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--glass-highlight), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                            <User size={20} />
                        </div>
                    </div>
                </header>

                <main style={{
                    flex: 1,
                    padding: activeTab === 'chat' ? '0' : '40px 48px',
                    overflowY: activeTab === 'chat' ? 'hidden' : 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            {activeTab === 'analytics' && <Analytics />}
                            {activeTab === 'dealers' && <DealerOverview />}
                            {activeTab === 'orders' && <OrderManager />}
                            {activeTab === 'products' && <ProductCRUD />}
                            {activeTab === 'chat' && <AdminChat />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
