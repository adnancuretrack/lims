import { Table, Button, Card, Typography, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, CodeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LookupService } from '../../api/LookupService';
import type { TestMethodDTO } from '../../api/types';

const { Title } = Typography;

export default function TestMethodListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: testMethods, isLoading } = useQuery({
        queryKey: ['testMethods'],
        queryFn: LookupService.getAllTestMethods,
    });

    const deleteMutation = useMutation({
        mutationFn: LookupService.deleteTestMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testMethods'] });
            message.success('Test method deleted successfully');
        },
        onError: (error: any) => {
            const errMsg = error.response?.data?.message || 'Cannot delete this test method because it is already in use by products or samples.';
            message.error(errMsg);
        }
    });

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Standard Ref', dataIndex: 'standardRef', key: 'standardRef' },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active: boolean) => (
                <Tag color={active ? 'success' : 'error'}>{active ? 'Active' : 'Inactive'}</Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: TestMethodDTO) => (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<CodeOutlined />}
                        onClick={() => navigate(`/test-methods/${record.id}/design`)}
                        title="Design & Configure"
                    >
                        Design
                    </Button>
                    <Popconfirm
                        title="Delete Test Method"
                        description={`Are you sure you want to delete ${record.code}?`}
                        onConfirm={() => deleteMutation.mutate(record.id!)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ loading: deleteMutation.isPending }}
                    >
                        <Button 
                            danger 
                            size="small" 
                            icon={<DeleteOutlined />}
                            title="Delete Method"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Title level={3}>Test Methods</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/test-methods/new/design')}
                >
                    Add Test Method
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={testMethods}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>
        </div>
    );
}
