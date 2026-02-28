import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Card, Descriptions, Tabs, Button, Space, Typography,
    Breadcrumb, Table, Tag, Empty, Result
} from 'antd';
import {
    FilePdfOutlined, HistoryOutlined, ArrowLeftOutlined,
    FileTextOutlined, MedicineBoxOutlined
} from '@ant-design/icons';
import { SampleService } from '../../api/SampleService';
import { AttachmentManager } from '../../components/attachment/AttachmentManager';
import { AuditTrailModal } from '../../components/audit/AuditTrailModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SampleDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [auditVisible, setAuditVisible] = useState(false);

    const { data: sample, isLoading, error } = useQuery({
        queryKey: ['sample', id],
        queryFn: () => SampleService.getById(Number(id)),
    });

    const { data: tests } = useQuery({
        queryKey: ['sample-tests', id],
        queryFn: () => SampleService.getTests(Number(id)),
        enabled: !!sample,
    });

    if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Title level={3}>Loading Sample Details...</Title></div>;
    if (error || !sample) return <Result status="404" title="Sample Not Found" />;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REGISTERED': return 'default';
            case 'RECEIVED': return 'blue';
            case 'IN_PROGRESS': return 'processing';
            case 'COMPLETED': return 'cyan';
            case 'AUTHORIZED': return 'success';
            case 'REJECTED': return 'error';
            default: return 'default';
        }
    };

    const handleDownloadCoa = () => {
        window.open(`${window.location.origin}/api/reports/coa/${sample.id}`, '_blank');
    };

    const testColumns = [
        { title: 'Method', dataIndex: 'methodName', key: 'method' },
        { title: 'Test Name', dataIndex: 'testName', key: 'name' },
        {
            title: 'Result',
            dataIndex: 'lastResult',
            key: 'result',
            render: (res: any) => res ? res.displayValue : <Text type="secondary">Pending</Text>
        },
        { title: 'Units', dataIndex: 'unit', key: 'unit' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={getStatusColor(s)}>{s}</Tag>
        },
    ];

    const tabItems = [
        {
            key: 'tests',
            label: <Space><MedicineBoxOutlined />Tests & Results</Space>,
            children: (
                <Table
                    dataSource={tests}
                    columns={testColumns}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: <Empty description="No tests assigned" /> }}
                />
            )
        },
        {
            key: 'attachments',
            label: <Space><FileTextOutlined />Attachments</Space>,
            children: <AttachmentManager sampleId={sample.id} />
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Breadcrumb items={[
                    { title: <a onClick={() => navigate('/samples')}>Sample Registry</a> },
                    { title: sample.sampleNumber }
                ]} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <Space direction="vertical" size={0}>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/samples')} />
                        <Title level={2} style={{ margin: 0 }}>{sample.sampleNumber}</Title>
                        <Tag color={getStatusColor(sample.status)} style={{ marginLeft: 8 }}>{sample.status}</Tag>
                    </Space>
                    <Text type="secondary">{sample.productName} - {sample.description}</Text>
                </Space>

                <Space>
                    <Button
                        icon={<HistoryOutlined />}
                        onClick={() => setAuditVisible(true)}
                    >
                        History
                    </Button>
                    <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        disabled={sample.status !== 'AUTHORIZED'}
                        onClick={handleDownloadCoa}
                    >
                        Download COA
                    </Button>
                </Space>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <Descriptions title="Metadata" bordered size="small">
                    <Descriptions.Item label="Client">{sample.clientName || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Product">{sample.productName}</Descriptions.Item>
                    <Descriptions.Item label="Condition">{sample.conditionOnReceipt}</Descriptions.Item>
                    <Descriptions.Item label="Received At">{sample.receivedAt ? dayjs(sample.receivedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Sampled At">{sample.sampledAt ? dayjs(sample.sampledAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Job Number">{sample.jobNumber || sample.sampleNumber.split('-')[0]}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Tabs items={tabItems} defaultActiveKey="tests" type="card" />

            <AuditTrailModal
                visible={auditVisible}
                onClose={() => setAuditVisible(false)}
                entityType="sample"
                entityId={sample.id}
                title={sample.sampleNumber}
            />
        </div>
    );
}
