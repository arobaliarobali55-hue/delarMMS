import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
    const [role, setRole] = useState<'dealer' | 'admin'>('dealer');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name, role }
                    }
                });
                if (error) throw error;

                // Robustness: If session exists (email confirm off), ensure profile exists
                if (data.session && data.user) {
                    const { error: profileError } = await supabase.from('profiles').upsert({
                        id: data.user.id,
                        name: name,
                        email: email,
                        role: role,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                    if (profileError) {
                        console.warn('Profile creation failed (might be handled by trigger):', profileError);
                    }
                }

                alert('Account created! Please check your email or try signing in.');
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1c1c21, #0a0a0c)'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: '40px', width: '100%', maxWidth: '400px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <ShieldCheck size={32} color="#000" />
                    </div>
                    <h1 className="gradient-text" style={{ fontSize: '2rem' }}>RESTO DEALER</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                        {isSignUp
                            ? (role === 'dealer' ? 'Dealer Registration' : 'Admin Registration')
                            : 'Partner Management System'
                        }
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', background: 'var(--bg-dark)', padding: '4px', borderRadius: '10px' }}>
                    <button
                        onClick={() => setRole('dealer')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: role === 'dealer' ? 'var(--primary)' : 'transparent',
                            color: role === 'dealer' ? '#000' : 'var(--text-muted)',
                            fontWeight: 600, transition: '0.2s'
                        }}
                    >
                        Dealer
                    </button>
                    <button
                        onClick={() => setRole('admin')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: role === 'admin' ? 'var(--primary)' : 'transparent',
                            color: role === 'admin' ? '#000' : 'var(--text-muted)',
                            fontWeight: 600, transition: '0.2s'
                        }}
                    >
                        Admin
                    </button>
                </div>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {isSignUp && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {role === 'dealer' ? 'Dealer / Store Name' : 'Full Name'}
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)',
                                    color: '#fff',
                                    fontSize: '1rem'
                                }}
                                placeholder={role === 'dealer' ? "My Store Name" : "John Doe"}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'var(--bg-dark)',
                                border: '1px solid var(--border)',
                                color: '#fff',
                                fontSize: '1rem'
                            }}
                            placeholder="dealer@example.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'var(--bg-dark)',
                                border: '1px solid var(--border)',
                                color: '#fff',
                                fontSize: '1rem'
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <p>{isSignUp ? 'Join our partner network today' : 'Restricted Access for Authorized Dealers & Staff'}</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
