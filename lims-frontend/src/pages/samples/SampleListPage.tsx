import { useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO } from '../../api/types';

const { Title } = Typography;

export default function SampleListPage() {
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['samples', pagination.current, pagination.pageSize],
        queryFn: () => SampleService.list(pagination.current - 1, pagination.pageSize),
    });

    const columns: ColumnsType<SampleDTO> = [
        {
            title: 'Sample No.',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
            render: (text, record) => <a onClick={() => navigate(`/samples/${record.id}`)}>{text}</a>,
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
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
                if (status === 'COMPLETED') color = 'success';
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
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Sample Registry</Title>
                <Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/samples/register')}
                    >
                        Register New Sample
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                </Space>
            </div>

            <Card styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={data?.content}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
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
