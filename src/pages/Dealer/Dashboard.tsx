import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Package, MessageSquare, History, LogOut } from 'lucide-react';
import ChatWindow from '../../components/Chat/ChatWindow';
import ProductList from '../../components/Dealer/ProductList';
import OrderHistory from '../../components/Dealer/OrderHistory';

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

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <div style={{
                width: '80px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 0',
                gap: '32px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                }}>
                    <Package color="#000" size={24} />
                </div>

                <button
                    onClick={() => setActiveTab('products')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                >
                    <Package size={28} />
                </button>

                <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                >
                    <MessageSquare size={28} />
                </button>

                <button
                    onClick={() => setActiveTab('orders')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                >
                    <History size={28} />
                </button>

                <div style={{ marginTop: 'auto' }}>
                    <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                        <LogOut size={28} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{
                    padding: '20px 40px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem' }}>
                            {activeTab === 'products' && 'Product Catalog'}
                            {activeTab === 'chat' && 'Admin Support'}
                            {activeTab === 'orders' && 'Your Orders'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, {profile?.name}</p>
                    </div>
                </header>

                <main style={{ flex: 1, padding: '20px 40px', overflowY: 'auto' }}>
                    {activeTab === 'products' && <ProductList adminId={adminId} />}
                    {activeTab === 'chat' && <ChatWindow isDealer={true} receiverId={adminId} />}
                    {activeTab === 'orders' && <OrderHistory />}
                </main>
            </div>
        </div>
    );
};

export default DealerDashboard;
