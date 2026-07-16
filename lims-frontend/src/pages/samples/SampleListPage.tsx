import { useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Input, Badge, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO } from '../../api/types';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;
const { Search } = Input;

export default function SampleListPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const hasRole = (role: string) => user?.roles.includes(role) || user?.roles.includes('ADMIN');

    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');

    const { data: stats } = useQuery({
        queryKey: ['sampleStats'],
        queryFn: SampleService.getStats,
    });

    // Derive status filter based on active tab
    const getStatusFilter = (tab: string) => {
        switch (tab) {
            case 'REGISTERED': return 'REGISTERED';
            case 'TESTING': return 'RECEIVED,IN_PROGRESS';
            case 'COMPLETED': return 'COMPLETED';
            case 'AUTHORIZED': return 'AUTHORIZED';
            case 'REJECTED': return 'REJECTED';
            default: return undefined;
        }
    };

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['samples', pagination.current, pagination.pageSize, searchText, activeTab],
        queryFn: () => SampleService.list(pagination.current - 1, pagination.pageSize, searchText, getStatusFilter(activeTab)),
    });

    const onSearch = (value: string) => {
        setSearchText(value);
        setPagination({ ...pagination, current: 1 }); // Reset to first page on search
    };

    const onTabChange = (key: string) => {
        setActiveTab(key);
        setPagination({ ...pagination, current: 1 });
    };

    const columns: ColumnsType<SampleDTO> = [
        {
            title: 'Sample No.',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
        },
        {
            title: 'Client',
            dataIndex: 'clientName',
            key: 'clientName',
        },
        {
            title: 'Job No.',
            dataIndex: 'jobNumber',
            key: 'jobNumber',
        },
        {
            title: 'Condition',
            dataIndex: 'conditionOnReceipt',
            key: 'conditionOnReceipt',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'COMPLETED') color = 'cyan';
                if (status === 'AUTHORIZED') color = 'success';
                if (status === 'IN_PROGRESS') color = 'processing';
                if (status === 'RECEIVED') color = 'blue';
                if (status === 'REJECTED') color = 'error';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: 'Received At',
            dataIndex: 'receivedAt',
            key: 'receivedAt',
            render: (date) => date ? new Date(date).toLocaleString() : '-',
        }
    ];

    const tabItems = [
        {
            key: 'ALL',
            label: 'All'
        },
        (hasRole('RECEPTIONIST') || hasRole('LAB_MANAGER') || hasRole('ANALYST') || hasRole('REVIEWER') || hasRole('AUTHORIZER')) ? {
            key: 'REGISTERED',
            label: <Badge count={stats?.unreceivedCount} offset={[10, 0]} size="small"><div style={{ paddingRight: 15 }}>Awaiting Intake</div></Badge>
        } : null,
        (hasRole('ANALYST') || hasRole('LAB_MANAGER')) ? {
            key: 'TESTING',
            label: <Badge count={stats?.inProgressCount} offset={[10, 0]} size="small"><div style={{ paddingRight: 15 }}>In Testing</div></Badge>
        } : null,
        (hasRole('REVIEWER') || hasRole('AUTHORIZER') || hasRole('LAB_MANAGER')) ? {
            key: 'COMPLETED',
            label: <Badge count={stats?.awaitingAuthorizationCount} offset={[10, 0]} size="small"><div style={{ paddingRight: 15 }}>Awaiting Review</div></Badge>
        } : null,
        {
            key: 'AUTHORIZED',
            label: <Badge count={stats?.authorizedTodayCount} offset={[10, 0]} size="small" color="#52c41a"><div style={{ paddingRight: 15 }}>Completed</div></Badge>
        },
        {
            key: 'REJECTED',
            label: <Badge count={stats?.rejectedCount} offset={[10, 0]} size="small" color="red"><div style={{ paddingRight: 15 }}>Rejected</div></Badge>
        }
    ].filter(Boolean) as any;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Samples</Title>
                <Space size="middle">
                    <Search
                        placeholder="Search samples..."
                        onSearch={onSearch}
                        style={{ width: 300 }}
                        allowClear
                        enterButton
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/samples/register')}
                    >
                        Register New Job
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                </Space>
            </div>

            <Card styles={{ body: { padding: 0 } }}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={onTabChange} 
                    items={tabItems} 
                    style={{ padding: '0 24px' }} 
                    tabBarStyle={{ marginBottom: 0 }}
                />
                <Table
                    dataSource={data?.content}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    onRow={(record) => ({
                        onClick: () => navigate(`/samples/${record.id}`),
                        style: { cursor: 'pointer' }
                    })}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: data?.totalElements,
                        onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                    }}
                />
            </Card>
        </div>
    );
}
