import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Package, MessageSquare, History, LogOut, ChevronRight, User } from 'lucide-react';
import ChatWindow from '../../components/Chat/ChatWindow';
import ProductList from '../../components/Dealer/ProductList';
import OrderHistory from '../../components/Dealer/OrderHistory';
import { motion, AnimatePresence } from 'framer-motion';

const DealerDashboard: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'products' | 'chat' | 'orders'>('products');
    const [adminId, setAdminId] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchAdmin = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single();
            if (data) setAdminId(data.id);
        };
        fetchAdmin();
    }, []);

    const menuItems = [
        { id: 'products', label: 'Catalog', icon: Package },
        { id: 'chat', label: 'Support', icon: MessageSquare },
        { id: 'orders', label: 'History', icon: History },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
                width: '100px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '32px 0',
                background: 'linear-gradient(180deg, rgba(18, 18, 20, 0.5), rgba(7, 7, 8, 0.5))',
                backdropFilter: 'blur(20px)',
                zIndex: 10
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '48px',
                    boxShadow: '0 8px 16px rgba(0, 242, 254, 0.2)'
                }}>
                    <Package color="#000" size={28} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.3s ease',
                                position: 'relative'
                            }}
                        >
                            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>{item.label}</span>
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    style={{
                                        position: 'absolute',
                                        right: '-32px',
                                        width: '4px',
                                        height: '32px',
                                        borderRadius: '4px 0 0 4px',
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
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--danger)',
                        padding: '12px',
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    <LogOut size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {activeTab !== 'chat' && (
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
                                Dashboard <ChevronRight size={12} /> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{activeTab}</span>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                                {activeTab === 'products' && 'Product Catalog'}
                                {activeTab === 'orders' && 'Your Orders'}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 16px', background: 'var(--glass)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile?.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Authorized Dealer</div>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--glass-highlight), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                <User size={20} />
                            </div>
                        </div>
                    </header>
                )}

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
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            {activeTab === 'products' && <ProductList adminId={adminId} />}
                            {activeTab === 'chat' && (
                                adminId ? (
                                    <ChatWindow isDealer={true} receiverId={adminId} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ marginBottom: '20px' }}></div>
                                        <span>Establishing secure connection...</span>
                                    </div>
                                )
                            )}
                            {activeTab === 'orders' && <OrderHistory />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default DealerDashboard;
