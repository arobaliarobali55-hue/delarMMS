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

        // 1. Initial Session Check
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    } else {
                        // No session, stop loading
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Session init error:', err);
                if (mounted) setLoading(false);
            }
        };

        initSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event);
            if (!mounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                // If we have a user but no profile (e.g. after login), fetch it
                // We check if we already have a profile to avoid redundant fetches if possible,
                // but for safety on login, we fetch.
                await fetchProfile(currentUser.id);
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
        // 1. Try to load from local storage first for instant UI
        const cachedProfile = localStorage.getItem(`profile_${userId}`);
        if (cachedProfile && !profile) {
            try {
                const parsed = JSON.parse(cachedProfile);
                setProfile(parsed);
                // If we found a cache, we can stop "loading" immediately while we re-validate in background
                setLoading(false);
            } catch (e) {
                console.error('Error parsing cached profile', e);
                localStorage.removeItem(`profile_${userId}`);
            }
        }

        // Prevent redundant fetches for the same user
        if (fetchingRef.current === userId) {
            console.log('Profile fetch already in progress for:', userId);
            return;
        }

        fetchingRef.current = userId;
        console.log('Fetching profile for:', userId);

        try {
            // Add a timeout promise (increased to 30s for slow connections)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 30000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) {
                console.error('Profile fetch error:', error);
                throw error;
            }

            if (!data && !error) {
                console.warn('No profile found for user:', userId);
            }

            if (data && fetchingRef.current === userId) {
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

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
