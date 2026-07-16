import { useAuthStore } from '../store/authStore';

export const useCanPerformAction = (sampleStatus: string) => {
    const user = useAuthStore((state) => state.user);
    if (!user || !user.roles) {
        return {
            canReceive: false,
            canReject: false,
            canEnterResults: false,
            canReview: false,
            canDelete: false,
        };
    }

    const roles = user.roles;
    const hasRole = (role: string) => roles.includes(role);
    
    const isAdminOrLabManager = hasRole('ADMIN') || hasRole('LAB_MANAGER');

    const canReceiveRoles = hasRole('RECEPTIONIST') || hasRole('ANALYST') || hasRole('REVIEWER') || hasRole('AUTHORIZER') || isAdminOrLabManager;
    const canEnterResultsRoles = hasRole('ANALYST') || isAdminOrLabManager;
    const canReviewRoles = hasRole('REVIEWER') || hasRole('AUTHORIZER') || isAdminOrLabManager;
    const canDeleteRoles = hasRole('ADMIN');

    return {
        canReceive: sampleStatus === 'REGISTERED' && canReceiveRoles,
        canReject: sampleStatus === 'REGISTERED' && canReceiveRoles,
        canEnterResults: (sampleStatus === 'RECEIVED' || sampleStatus === 'IN_PROGRESS') && canEnterResultsRoles,
        canReview: sampleStatus === 'COMPLETED' && canReviewRoles,
        canDelete: canDeleteRoles,
    };
};
