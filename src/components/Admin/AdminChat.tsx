import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import ChatWindow from '../Chat/ChatWindow';
import { Search, User } from 'lucide-react';

const AdminChat: React.FC = () => {
    const [dealers, setDealers] = useState<Profile[]>([]);
    const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDealers = async () => {
            const { data } = await supabase.from('profiles').select('*').eq('role', 'dealer');
            if (data) setDealers(data);
        };
        fetchDealers();
    }, []);

    const filteredDealers = dealers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: '600px' }}>
            {/* Dealer List */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        placeholder="Search dealers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '12px 12px 12px 40px', borderRadius: '10px', color: '#fff' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredDealers.map((d) => (
                        <button
                            key={d.id}
                            onClick={() => setSelectedDealerId(d.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '10px',
                                border: selectedDealerId === d.id ? '1px solid var(--primary)' : '1px solid transparent',
                                background: selectedDealerId === d.id ? 'var(--glass)' : 'none',
                                color: selectedDealerId === d.id ? 'var(--primary)' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{d.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Support</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1 }}>
                {selectedDealerId ? (
                    <ChatWindow isDealer={false} receiverId={selectedDealerId} />
                ) : (
                    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ padding: '24px', borderRadius: '50%', background: 'var(--glass)', marginBottom: '20px' }}>
                            <User size={48} />
                        </div>
                        <p>Select a dealer to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChat;
