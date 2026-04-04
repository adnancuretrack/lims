import { Table, Button, Card, Typography, Tag, Space } from 'antd';
import { PlusOutlined, CodeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LookupService } from '../../api/LookupService';
import type { TestMethodDTO } from '../../api/types';

const { Title } = Typography;

export default function TestMethodListPage() {
    const navigate = useNavigate();

    const { data: testMethods, isLoading } = useQuery({
        queryKey: ['testMethods'],
        queryFn: LookupService.getAllTestMethods,
    });

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Standard Ref', dataIndex: 'standardRef', key: 'standardRef' },
        {
            title: 'Type',
            dataIndex: 'resultType',
            key: 'resultType',
            render: (type: string) => (
                <Tag color={type === 'QUANTITATIVE' ? 'blue' : 'orange'}>{type}</Tag>
            )
        },
        { title: 'Unit', dataIndex: 'unit', key: 'unit' },
        {
            title: 'Limits',
            key: 'limits',
            render: (_: any, record: TestMethodDTO) => (
                record.resultType === 'QUANTITATIVE' ? (
                    <span>{record.minLimit ?? '-'} to {record.maxLimit ?? '-'}</span>
                ) : 'N/A'
            )
        },
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
