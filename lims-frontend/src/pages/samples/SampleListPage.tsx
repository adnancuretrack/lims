import { useState } from 'react';
import { Table, Tag, Button, Space, Card, Typography, Input, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO } from '../../api/types';

const { Title } = Typography;
const { Search } = Input;

export default function SampleListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [searchText, setSearchText] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['samples', pagination.current, pagination.pageSize, searchText],
        queryFn: () => SampleService.list(pagination.current - 1, pagination.pageSize, searchText),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => SampleService.deleteSample(id),
        onSuccess: () => {
            message.success('Sample deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
        },
        onError: (error: any) => {
            message.error('Failed to delete sample: ' + (error.response?.data?.message || error.message));
        }
    });

    const onSearch = (value: string) => {
        setSearchText(value);
        setPagination({ ...pagination, current: 1 }); // Reset to first page on search
    };

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
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space size="middle">
                    <Popconfirm
                        title="Delete Sample"
                        description="Are you sure you want to delete this sample? This will also delete all associated test results."
                        onConfirm={() => deleteMutation.mutate(record.id!)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Delete Sample"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Sample Registry</Title>
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
