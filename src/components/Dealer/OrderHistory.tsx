import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderHistory: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products:products!orders_product_id_fkey(name, price)
                `)
                .eq('dealer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching order history:', error);
                toast.error('Failed to load history');
            } else if (data) {
                setOrders(data as unknown as Order[]);
            }
            setLoading(false);
        };

        fetchOrders();

        // Subscribe to ALL events for orders table (INSERT, UPDATE, DELETE)
        // This ensures new orders appear and status updates are reflected instantly
        const channel = supabase.channel(`dealer_orders_${user.id}`)
            .on('postgres_changes', {
                event: '*', // Listen to all changes
                schema: 'public',
                table: 'orders',
                filter: `dealer_id=eq.${user.id}`
            }, (payload) => {
                console.log('Order change detected:', payload);
                // Simple approach: re-fetch to get joined product data correctly
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'confirmed': return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', icon: <CheckCircle size={14} /> };
            case 'pending': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', icon: <Clock size={14} /> };
            case 'cancelled': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', icon: <XCircle size={14} /> };
            default: return { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', icon: <AlertCircle size={14} /> };
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel"
            style={{ overflow: 'hidden' }}
        >
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '20px' }}>Order Details</th>
                            <th style={{ padding: '20px' }}>Quantity</th>
                            <th style={{ padding: '20px' }}>Price</th>
                            <th style={{ padding: '20px' }}>Status</th>
                            <th style={{ padding: '20px' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.95rem' }}>
                        <AnimatePresence>
                            {orders.map((order) => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={order.id}
                                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ fontWeight: 600 }}>{order.products?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>#{order.id.slice(0, 8)}</div>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{ fontWeight: 500 }}>{order.quantity}</span>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                            ৳{(order.quantity * (order.products?.price || 0)).toLocaleString()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: getStatusStyles(order.status).bg,
                                            color: getStatusStyles(order.status).color,
                                            border: `1px solid ${getStatusStyles(order.status).color}22`
                                        }}>
                                            {getStatusStyles(order.status).icon}
                                            {order.status.toUpperCase()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
            {orders.length === 0 && (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Package size={32} style={{ opacity: 0.5 }} />
                    </div>
                    <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Orders Found</h3>
                    <p>When you place an order via products list or chat, it will appear here.</p>
                </div>
            )}
        </motion.div>
    );
};

export default OrderHistory;
