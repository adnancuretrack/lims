import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Avatar, Dropdown, Space, Typography } from 'antd';
import {
    DashboardOutlined,
    ExperimentOutlined,
    FileSearchOutlined,
    AuditOutlined,
    SettingOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ProjectOutlined,
    TeamOutlined,
    ShopOutlined,
    ScanOutlined,
    LineChartOutlined,
    MedicineBoxOutlined,
    CodeOutlined,
    ToolOutlined,
    BarChartOutlined,
    AlertOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../../store/authStore';

import { useHasRole } from '../../hooks/useHasRole';
import { NotificationBell } from '../notification/NotificationBell';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const isAdmin = useHasRole('ADMIN');

    const hasRole = (role: string) => user?.roles.includes(role) || user?.roles.includes('ADMIN');

    const sideMenuItems: MenuProps['items'] = [
        { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },

        {
            key: 'operations',
            icon: <ExperimentOutlined />,
            label: 'Operations',
            children: [
                hasRole('RECEPTIONIST') ? { key: '/samples/receive', icon: <ScanOutlined />, label: 'Sample Intake' } : null,
                { key: '/samples', icon: <ExperimentOutlined />, label: 'Sample List' },
                hasRole('ANALYST') ? { key: '/analysis', icon: <FileSearchOutlined />, label: 'Result Entry' } : null,
                (hasRole('REVIEWER') || hasRole('AUTHORIZER')) ? { key: '/review', icon: <AuditOutlined />, label: 'Review Queue' } : null,
            ].filter(Boolean) as MenuProps['items']
        },

        {
            key: 'quality',
            icon: <LineChartOutlined />,
            label: 'Quality & Compliance',
            children: [
                { key: '/qc', icon: <LineChartOutlined />, label: 'QC Control' },
                { key: '/investigations', icon: <AlertOutlined />, label: 'Investigations' },
            ]
        },

        isAdmin ? {
            key: 'master-data',
            icon: <TeamOutlined />,
            label: 'Master Data',
            children: [
                { key: '/clients', icon: <TeamOutlined />, label: 'Clients' },
                { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
                { key: '/products', icon: <ShopOutlined />, label: 'Products' },
                { key: '/test-methods', icon: <FileSearchOutlined />, label: 'Test Methods' },
            ]
        } : null,

        isAdmin ? {
            key: 'resources',
            icon: <MedicineBoxOutlined />,
            label: 'Resource Management',
            children: [
                { key: '/inventory', icon: <MedicineBoxOutlined />, label: 'Inventory' },
                { key: '/instruments', icon: <ToolOutlined />, label: 'Instruments' },
            ]
        } : null,

        {
            key: 'system',
            icon: <SettingOutlined />,
            label: 'System',
            children: [
                isAdmin ? { key: '/admin/users', icon: <SettingOutlined />, label: 'User Management' } : null,
                { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
                isAdmin ? { key: '/admin/erp-simulator', icon: <CodeOutlined />, label: 'ERP Simulator' } : null,
            ].filter(Boolean) as MenuProps['items']
        },
    ].filter(Boolean) as MenuProps['items'];

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        navigate(key);
    };

    const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
        if (key === 'logout') {
            logout();
            navigate('/login');
        }
    };

    const userMenuItems: MenuProps['items'] = [
        { key: 'profile', icon: <UserOutlined />, label: user?.displayName || 'User' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                style={{
                    background: token.colorBgContainer,
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                }}
                width={240}
            >
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? 0 : '0 24px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}>
                    <Text strong style={{ fontSize: collapsed ? 16 : 20, color: token.colorPrimary }}>
                        {collapsed ? 'L' : 'LIMS'}
                    </Text>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={sideMenuItems}
                    onClick={handleMenuClick}
                    style={{ border: 'none', marginTop: 8 }}
                />
            </Sider>

            <Layout>
                <Header style={{
                    background: token.colorBgContainer,
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}>
                    <div
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ cursor: 'pointer', fontSize: 18 }}
                    >
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <NotificationBell />
                        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                                <Text>{user?.displayName || 'User'}</Text>
                            </Space>
                        </Dropdown>
                    </div>
                </Header>

                <Content style={{ margin: 24, minHeight: 280 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
