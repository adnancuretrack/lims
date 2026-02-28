import { useAuthStore } from '../store/authStore';

export const useHasRole = (role: string) => {
    const user = useAuthStore((state) => state.user);
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
};
