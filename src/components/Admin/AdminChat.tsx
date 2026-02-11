import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import ChatWindow from '../Chat/ChatWindow';
import { Search, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div style={{ display: 'flex', gap: '32px', height: '100%', minHeight: '600px' }}>
            {/* Dealer List */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        placeholder="Search dealers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-panel"
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            padding: '14px 14px 14px 44px',
                            borderRadius: '14px',
                            color: '#fff',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredDealers.map((d) => (
                        <motion.button
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            key={d.id}
                            onClick={() => setSelectedDealerId(d.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px',
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: selectedDealerId === d.id ? 'var(--primary)' : 'transparent',
                                background: selectedDealerId === d.id ? 'var(--glass)' : 'rgba(255,255,255,0.02)',
                                color: selectedDealerId === d.id ? 'var(--primary)' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: selectedDealerId === d.id ? 'rgba(0, 242, 254, 0.1)' : 'var(--glass)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border)'
                            }}>
                                <User size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{d.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                                    Active Now
                                </div>
                            </div>
                        </motion.button>
                    ))}
                    {filteredDealers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No dealers match your search
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {selectedDealerId ? (
                        <motion.div
                            key={selectedDealerId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ height: '100%' }}
                        >
                            <ChatWindow isDealer={false} receiverId={selectedDealerId} />
                        </motion.div>
                    ) : (
                        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <MessageSquare size={48} style={{ opacity: 0.3 }} />
                            </div>
                            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Start a Conversation</h3>
                            <p>Select a dealer from the list to begin messaging</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminChat;
