import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';

const OrderManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
            *,
            dealer:profiles!dealer_id(name),
            product:products!product_id(name, price)
          `)
                .order('created_at', { ascending: false });

            if (!error && data) setOrders(data as unknown as Order[]);
            setLoading(false);
        };

        fetchOrders();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('orders').update({ status }).eq('id', id);
        // Refresh local state without a full fetch if possible, or just re-fetch
        const { data } = await supabase
            .from('orders')
            .select(`
            *,
            dealer:profiles!dealer_id(name),
            product:products!product_id(name, price)
          `)
            .order('created_at', { ascending: false });
        if (data) setOrders(data as unknown as Order[]);
    };

    if (loading) return <div>Fetching global orders...</div>;

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h3>Order Feed</h3>
                <p style={{ color: 'var(--text-muted)' }}>Real-time stream of incoming dealer requests</p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                {orders.map((order) => (
                    <div key={order.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--glass)', color: 'var(--primary)' }}>
                                <ClipboardList size={24} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{order.products?.name || 'Unknown'} x {order.quantity}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Dealer: <strong style={{ color: '#fff' }}>{order.dealer?.name || 'Unknown'}</strong> •
                                    Price: ${(order.products?.price || 0) * order.quantity}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {new Date(order.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                style={{
                                    background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)',
                                    color: '#fff',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            {order.status === 'pending' && (
                                <button
                                    onClick={() => updateStatus(order.id, 'confirmed')}
                                    style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
                                >
                                    <CheckCircle2 size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderManager;
