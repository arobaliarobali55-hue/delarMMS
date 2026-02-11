import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { ClipboardList, CheckCircle2, Clock, Package, User, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const OrderManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                dealer:profiles!dealer_id(name),
                products:products!product_id(name, price)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) setOrders(data as unknown as Order[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();

        // Subscribe to all order changes
        const channel = supabase.channel('admin_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const updateStatus = async (id: string, status: string) => {
        const toastId = toast.loading('Updating status...');
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', id);
            if (error) throw error;

            // Send notification message to dealer
            const order = orders.find(o => o.id === id);
            if (order && user) {
                const productName = order.products?.name || 'Product';
                const notification = `📢 Order Update: Your order for ${productName} (x${order.quantity}) is now marked as ${status.toUpperCase()}.`;

                await supabase.from('messages').insert([{
                    sender_id: user.id,
                    receiver_id: order.dealer_id,
                    message: notification,
                    type: 'system'
                }]);
            }

            toast.success(`Order marked as ${status}`, { id: toastId });
            await fetchOrders();
        } catch (err: any) {
            toast.error('Failed to update: ' + err.message, { id: toastId });
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        revenue: orders.reduce((acc, o) => acc + (o.quantity * (o.products?.price || 0)), 0)
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="fade-in">
            {/* Stats Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(79, 172, 254, 0.1)', color: 'var(--secondary)' }}>
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Orders</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.pending}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Revenue</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>৳{stats.revenue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <AnimatePresence>
                    {orders.map((order) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={order.id}
                            className="glass-panel"
                            style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    background: 'var(--glass)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary)'
                                }}>
                                    <Package size={28} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.products?.name || 'Product'}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>x {order.quantity}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                            <User size={14} />
                                            <span style={{ color: '#fff', fontWeight: 500 }}>{order.dealer?.name || 'Dealer'}</span>
                                        </div>
                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }} />
                                        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                            Total: ৳{(order.quantity * (order.products?.price || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> {new Date(order.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Update Status</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            style={{
                                                background: 'var(--bg-dark)',
                                                border: '1px solid var(--border)',
                                                color: '#fff',
                                                padding: '10px 32px 10px 16px',
                                                borderRadius: '10px',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                appearance: 'none',
                                                outline: 'none',
                                                width: '140px'
                                            }}
                                        >
                                            <option value="pending" style={{ background: '#1a1a1a' }}>Pending</option>
                                            <option value="confirmed" style={{ background: '#1a1a1a' }}>Confirmed</option>
                                            <option value="delivered" style={{ background: '#1a1a1a' }}>Delivered</option>
                                            <option value="cancelled" style={{ background: '#1a1a1a' }}>Cancelled</option>
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                                            ▼
                                        </div>
                                    </div>
                                </div>

                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'confirmed')}
                                        className="btn-primary"
                                        style={{ padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', marginTop: '18px' }}
                                    >
                                        <CheckCircle2 size={18} />
                                        <span>Confirm</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {orders.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
                        <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>No orders yet. They will appear here in real-time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderManager;
