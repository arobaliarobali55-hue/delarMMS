import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Camera, Save, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const Settings: React.FC = () => {
    const { profile, updateProfile } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                name: name.trim(),
                avatar_url: avatarUrl.trim()
            });
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Account Settings</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage your profile information and preferences.</p>
            </div>

            <div style={{ display: 'grid', gap: '24px' }}>
                {/* Profile Section */}
                <section style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '32px',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <User size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Profile Information</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                border: '2px solid var(--border)',
                                background: 'var(--glass-highlight)',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={40} color="var(--text-muted)" />
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Avatar URL</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        placeholder="https://example.com/avatar.jpg"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            paddingLeft: '44px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            color: '#fff',
                                            outline: 'none'
                                        }}
                                    />
                                    <Camera size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Email Address</label>
                            <input
                                type="email"
                                value={profile?.email}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '8px' }}>Email cannot be changed.</p>
                        </div>
                    </div>
                </section>

                {/* Preferences Section (Placeholder) */}
                <section style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '32px',
                    opacity: 0.8
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <Bell size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Notifications</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Notification preferences will be available soon.</p>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'var(--primary)',
                            color: '#000',
                            padding: '14px 32px',
                            borderRadius: '14px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0, 242, 254, 0.25)',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? (
                            <div className="loading-spinner" style={{ width: '20px', height: '20px', borderTopColor: '#000' }}></div>
                        ) : (
                            <Save size={20} />
                        )}
                        {isSaving ? 'Updating...' : 'Save Changes'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
