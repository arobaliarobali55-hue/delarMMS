import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});
