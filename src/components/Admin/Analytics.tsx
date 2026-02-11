import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';

const Analytics: React.FC = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalDealers: 0,
        lowStockCount: 0,
        avgOrderValue: 0
    });
    const [orderTrend, setOrderTrend] = useState<{ name: string; orders: number }[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<{ name: string; revenue: number }[]>([]);
    const [productPerformance, setProductPerformance] = useState<{ name: string; sold: number; revenue: number; stock: number }[]>([]);

    useEffect(() => {
        const fetchAllData = async () => {
            const { data: orders } = await supabase.from('orders').select('*, products(price, name)');
            const { count: dealers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'dealer');
            const { data: products } = await supabase.from('products').select('*');

            const revenue = orders?.reduce((acc, curr) => acc + (curr.quantity * (curr.products?.price || 0)), 0) || 0;
            const lowStock = products?.filter(p => p.stock < 10).length || 0;
            const avgValue = orders?.length ? revenue / orders.length : 0;

            setStats({
                totalRevenue: revenue,
                totalOrders: orders?.length || 0,
                totalDealers: dealers || 0,
                lowStockCount: lowStock,
                avgOrderValue: avgValue
            });

            // Simulated day-by-day stats for the last 7 days
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            setOrderTrend(days.map(d => ({ name: d, orders: Math.floor(Math.random() * 15) + 5 })));
            setRevenueTrend(days.map(d => ({ name: d, revenue: Math.floor(Math.random() * 500) + 200 })));

            // Product Performance
            const perf = products?.map(p => {
                const sold = orders?.filter(o => o.product_id === p.id).reduce((acc, o) => acc + o.quantity, 0) || 0;
                return {
                    name: p.name,
                    sold,
                    revenue: sold * p.price,
                    stock: p.stock
                };
            }).sort((a, b) => b.sold - a.sold).slice(0, 6) || [];

            setProductPerformance(perf);
        };

        fetchAllData();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
            {/* Header Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <StatCard icon={<DollarSign />} label="Gross Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} color="var(--primary)" />
                <StatCard icon={<TrendingUp />} label="Total Orders" value={stats.totalOrders.toString()} color="var(--success)" />
                <StatCard icon={<BarChart3 />} label="Avg. Ticket" value={`$${stats.avgOrderValue.toFixed(2)}`} color="var(--secondary)" />
                <StatCard icon={<Users />} label="Partners" value={stats.totalDealers.toString()} color="#3a7bd5" />
                <StatCard icon={<AlertTriangle />} label="Low Stock" value={stats.lowStockCount.toString()} color="var(--danger)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Revenue Growth */}
                <div className="glass-panel" style={{ padding: '30px', height: '400px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '1.2rem', margin: 0 }}>Revenue Projection</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Simulated weekly revenue growth</p>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={revenueTrend}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                            <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Order Trend */}
                <div className="glass-panel" style={{ padding: '30px', height: '400px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '1.2rem', margin: 0 }}>Order Velocity</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Weekly order volume fluctuations</p>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={orderTrend}>
                            <defs>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                            <Area type="monotone" dataKey="orders" stroke="var(--secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Performance Matrix */}
                <div className="glass-panel" style={{ padding: '30px' }}>
                    <h4 style={{ marginBottom: '30px' }}>Sales Velocity by Product</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '15px' }}>Product</th>
                                    <th style={{ padding: '15px' }}>Units Sold</th>
                                    <th style={{ padding: '15px' }}>Revenue</th>
                                    <th style={{ padding: '15px' }}>Performance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productPerformance.map((p) => (
                                    <tr key={p.name} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '15px', fontWeight: 600 }}>{p.name}</td>
                                        <td style={{ padding: '15px' }}>{p.sold} units</td>
                                        <td style={{ padding: '15px' }}>${p.revenue.toLocaleString()}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary)' }}>
                                                TOP
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Performance Gauge */}
                <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginBottom: '24px' }}>Inventory Health</h4>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Healthy', value: Math.max(stats.totalOrders - stats.lowStockCount, 0) || 10 },
                                        { name: 'Low Stock', value: stats.lowStockCount || 2 },
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Optimum Items</span>
                                <span style={{ color: 'var(--success)' }}>{Math.max(stats.totalOrders - stats.lowStockCount, 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Critical Replenish</span>
                                <span style={{ color: 'var(--danger)' }}>{stats.lowStockCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactElement<{ size?: number }>, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ padding: '14px', borderRadius: '14px', background: `${color}15`, color: color }}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>{label}</p>
            <h3 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>{value}</h3>
        </div>
    </div>
);

export default Analytics;
