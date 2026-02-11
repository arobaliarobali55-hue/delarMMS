import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import { User, ShieldAlert } from 'lucide-react';

const DealerOverview: React.FC = () => {
    const [dealers, setDealers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDealers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'dealer')
                .order('name');

            if (!error && data) setDealers(data);
            setLoading(false);
        };

        fetchDealers();
    }, []);

    // if (loading) return <div>Loading partners...</div>; (Removed to show skeleton inside the table)

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h3>Registered Dealers</h3>
                <p style={{ color: 'var(--text-muted)' }}>Oversee your network of restaurant partners</p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '16px' }}>Dealer Name</th>
                            <th style={{ padding: '16px' }}>Partner ID</th>
                            <th style={{ padding: '16px' }}>Status</th>
                            <th style={{ padding: '16px' }}>Access</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} className="animate-pulse" />
                                            <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} className="animate-pulse" />
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}><div style={{ width: '100px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} className="animate-pulse" /></td>
                                    <td style={{ padding: '16px' }}><div style={{ width: '60px', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} className="animate-pulse" /></td>
                                    <td style={{ padding: '16px' }}><div style={{ width: '80px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} className="animate-pulse" /></td>
                                </tr>
                            ))
                        ) : (
                            dealers.map((dealer) => (
                                <tr key={dealer.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                                                <User size={18} />
                                            </div>
                                            <span>{dealer.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{dealer.id.slice(0, 13)}...</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                            ACTIVE
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                                            View Stats
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}

                    </tbody>
                </table>
                {!loading && dealers.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ShieldAlert size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>No dealers registered yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DealerOverview;
