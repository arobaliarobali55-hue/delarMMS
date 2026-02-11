import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Listen for auth changes - Supabase will emit an event immediately for the initial session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event);
            if (!mounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                // Fetch profile only if we don't have it, or it's a login event
                fetchProfile(currentUser.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchingRef = React.useRef<string | null>(null);

    const fetchProfile = async (userId: string) => {
        // Prevent redundant fetches
        if (fetchingRef.current === userId) return;

        // Instant UI from local storage
        const cachedProfile = localStorage.getItem(`profile_${userId}`);
        if (cachedProfile && !profile) {
            try {
                const parsed = JSON.parse(cachedProfile);
                setProfile(parsed);
                setLoading(false);
            } catch (e) {
                localStorage.removeItem(`profile_${userId}`);
            }
        }

        fetchingRef.current = userId;
        console.log('Fetching profile for:', userId);

        try {
            // Re-validate profile data in background
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;

            if (data && mountedRef.current) {
                setProfile(data);
                localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
            }
        } catch (err: any) {
            console.error('Error in fetchProfile:', err);
        } finally {
            if (fetchingRef.current === userId) {
                setLoading(false);
                fetchingRef.current = null;
            }
        }
    };

    const mountedRef = React.useRef(true);
    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setProfile(prev => {
                const updated = prev ? { ...prev, ...updates } : null;
                if (updated) {
                    localStorage.setItem(`profile_${user.id}`, JSON.stringify(updated));
                }
                return updated;
            });
        } catch (err) {
            console.error('Update profile error:', err);
            throw err;
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login?mode=reset`,
        });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};
