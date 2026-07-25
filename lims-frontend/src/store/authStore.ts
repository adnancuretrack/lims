import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserInfo {
    username: string;
    displayName: string;
    email?: string;
    phone?: string;
    roles: string[];
}

interface AuthState {
    token: string | null;
    user: UserInfo | null;
    isAuthenticated: boolean;
    setAuth: (token: string, user: UserInfo) => void;
    updateUser: (updates: Partial<UserInfo>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            setAuth: (token, user) => set({
                token,
                user,
                isAuthenticated: true,
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null,
            })),

            logout: () => set({
                token: null,
                user: null,
                isAuthenticated: false,
            }),
        }),
        {
            name: 'lims-auth',
        }
    )
);
