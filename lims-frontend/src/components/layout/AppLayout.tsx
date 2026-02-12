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
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const sideMenuItems: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/samples', icon: <ExperimentOutlined />, label: 'Samples' },
    { key: '/analysis', icon: <FileSearchOutlined />, label: 'Analysis' },
    { key: '/review', icon: <AuditOutlined />, label: 'Review' },
    { type: 'divider' },
    { key: '/admin/users', icon: <SettingOutlined />, label: 'Admin' },
];

const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
];

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        navigate(key);
    };

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

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                            <Text>Admin</Text>
                        </Space>
                    </Dropdown>
                </Header>

                <Content style={{ margin: 24, minHeight: 280 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
