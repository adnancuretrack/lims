import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy-loaded page modules
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Sample lifecycle
const SampleListPage = lazy(() => import('./pages/samples/SampleListPage'));
const SampleRegisterPage = lazy(() => import('./pages/samples/SampleRegisterPage'));

// Analysis
const ResultEntryPage = lazy(() => import('./pages/analysis/ResultEntryPage'));

// Review
const ReviewQueuePage = lazy(() => import('./pages/review/ReviewQueuePage'));

// Admin
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));

export const routes: RouteObject[] = [
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
        children: [
            { index: true, element: <DashboardPage /> },
            // Sample lifecycle
            { path: 'samples', element: <SampleListPage /> },
            { path: 'samples/register', element: <SampleRegisterPage /> },
            // Analysis & results
            { path: 'analysis', element: <ResultEntryPage /> },
            // Review & approval
            { path: 'review', element: <ReviewQueuePage /> },
            // Admin
            { path: 'admin/users', element: <UsersPage /> },
        ],
    },
];
