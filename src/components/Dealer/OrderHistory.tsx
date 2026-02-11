import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { Package } from 'lucide-react';

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
          products:product_id(name, price)
        `)
                .eq('dealer_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) setOrders(data as unknown as Order[]);
            setLoading(false);
        };

        fetchOrders();
    }, [user]);

    if (loading) return <div>Fetching your history...</div>;

    return (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--glass)' }}>
                        <th style={{ padding: '16px' }}>Order ID</th>
                        <th style={{ padding: '16px' }}>Product</th>
                        <th style={{ padding: '16px' }}>Quantity</th>
                        <th style={{ padding: '16px' }}>Status</th>
                        <th style={{ padding: '16px' }}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order) => (
                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>#{order.id.slice(0, 8)}</td>
                            <td style={{ padding: '16px' }}>{order.products?.name}</td>
                            <td style={{ padding: '16px' }}>{order.quantity}</td>
                            <td style={{ padding: '16px' }}>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: order.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: order.status === 'confirmed' ? 'var(--success)' : 'var(--warning)'
                                }}>
                                    {order.status.toUpperCase()}
                                </span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {new Date(order.created_at).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {orders.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Package size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>No orders yet. Start by messaging the admin!</p>
                </div>
            )}
        </div>
    );
};

export default OrderHistory;
