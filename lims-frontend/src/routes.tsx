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
const SampleReceivePage = lazy(() => import('./pages/samples/SampleReceivePage'));
const SampleDetailPage = lazy(() => import('./pages/samples/SampleDetailPage'));

// Analysis
const ResultEntryPage = lazy(() => import('./pages/analysis/ResultEntryPage'));

// Review
const ReviewQueuePage = lazy(() => import('./pages/review/ReviewQueuePage'));

// Admin
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const ProjectListPage = lazy(() => import('./pages/projects/ProjectListPage'));
const ClientListPage = lazy(() => import('./pages/clients/ClientListPage'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const TestMethodListPage = lazy(() => import('./pages/methods/TestMethodListPage'));

// ERP
const ErpSimulatorPage = lazy(() => import('./pages/admin/ErpSimulatorPage'));

// QC
const QcDashboardPage = lazy(() => import('./pages/qc/QcDashboardPage'));

// Investigations
const InvestigationListPage = lazy(() => import('./pages/investigation/InvestigationListPage'));
const InvestigationDetailPage = lazy(() => import('./pages/investigation/InvestigationDetailPage'));

// Reports
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));

// Inventory
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const InstrumentPage = lazy(() => import('./pages/inventory/InstrumentPage'));

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
            { path: 'samples/receive', element: <SampleReceivePage /> },
            { path: 'samples/:id', element: <SampleDetailPage /> },
            // Analysis & results
            { path: 'analysis', element: <ResultEntryPage /> },
            // Review & approval
            { path: 'review', element: <ReviewQueuePage /> },
            // Admin
            { path: 'admin/users', element: <ProtectedRoute requiredRole="ADMIN"><UserManagementPage /></ProtectedRoute> },
            { path: 'projects', element: <ProtectedRoute requiredRole="ADMIN"><ProjectListPage /></ProtectedRoute> },
            { path: 'clients', element: <ProtectedRoute requiredRole="ADMIN"><ClientListPage /></ProtectedRoute> },
            { path: 'products', element: <ProtectedRoute requiredRole="ADMIN"><ProductListPage /></ProtectedRoute> },
            { path: 'test-methods', element: <ProtectedRoute requiredRole="ADMIN"><TestMethodListPage /></ProtectedRoute> },
            // ERP
            { path: 'qc', element: <QcDashboardPage /> },
            // Investigations
            { path: 'investigations', element: <InvestigationListPage /> },
            { path: 'investigations/:id', element: <InvestigationDetailPage /> },
            // Reports
            { path: 'reports', element: <ReportsPage /> },
            // Admin
            { path: 'admin/erp-simulator', element: <ProtectedRoute requiredRole="ADMIN"><ErpSimulatorPage /></ProtectedRoute> },
            { path: 'inventory', element: <ProtectedRoute requiredRole="ADMIN"><InventoryPage /></ProtectedRoute> },
            { path: 'instruments', element: <ProtectedRoute requiredRole="ADMIN"><InstrumentPage /></ProtectedRoute> },
        ],
    },
];
