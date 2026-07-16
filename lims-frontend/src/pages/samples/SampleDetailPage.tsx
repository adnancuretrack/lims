import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card, Descriptions, Tabs, Button, Space, Typography,
    Breadcrumb, Tag, Empty, Result
} from 'antd';
import {
    FilePdfOutlined, HistoryOutlined, ArrowLeftOutlined,
    FileTextOutlined, MedicineBoxOutlined
} from '@ant-design/icons';
import { SampleService } from '../../api/SampleService';
import { AttachmentManager } from '../../components/attachment/AttachmentManager';
import { AuditTrailModal } from '../../components/audit/AuditTrailModal';
import { WorksheetReviewPanel } from '../../components/worksheet/WorksheetReviewPanel';
import { IntakeActionPanel } from '../../components/sample-actions/IntakeActionPanel';
import { ReviewActionPanel } from '../../components/sample-actions/ReviewActionPanel';
import { useCanPerformAction } from '../../hooks/useCanPerformAction';
import { EmbeddableWorksheetEngine } from '../../components/worksheet/EmbeddableWorksheetEngine';
import { message, Collapse, Alert, Popconfirm } from 'antd';
import { DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SampleDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [auditVisible, setAuditVisible] = useState(false);
    const queryClient = useQueryClient();

    const { data: sample, isLoading, error } = useQuery({
        queryKey: ['sample', id],
        queryFn: () => SampleService.getById(Number(id)),
    });

    const { data: tests } = useQuery({
        queryKey: ['sample-tests', id],
        queryFn: () => SampleService.getTests(Number(id)),
        enabled: !!sample,
    });

    const actions = useCanPerformAction(sample?.status || '');

    const deleteMutation = useMutation({
        mutationFn: (id: number) => SampleService.deleteSample(id),
        onSuccess: () => {
            message.success('Sample deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            navigate('/samples');
        },
        onError: (error: any) => {
            message.error('Failed to delete sample: ' + (error.response?.data?.message || error.message));
        }
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

    const handleDownloadCoa = async () => {
        if (!sample) return;
        
        const hide = message.loading('Generating COA...', 0);
        try {
            const blob = await SampleService.downloadCoa(sample.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `COA_${sample.sampleNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success('COA downloaded successfully');
        } catch (error) {
            console.error('Download failed:', error);
            message.error('Failed to download COA');
        } finally {
            hide();
        }
    };





    const tabItems = [
        {
            key: 'tests',
            label: <Space><MedicineBoxOutlined />Tests & Results</Space>,
            children: Array.isArray(tests) && tests.length > 0 ? (
                <Collapse
                    accordion
                    items={tests.map((test: any) => ({
                        key: test.id,
                        label: (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: 24 }}>
                                <Space>
                                    <ExperimentOutlined />
                                    <Text strong>{test.testMethodName}</Text>
                                    <Tag color="blue">{test.status}</Tag>
                                </Space>
                                <Space>
                                    <Text type="secondary">Status:</Text>
                                    <Text strong>{test.status}</Text>
                                </Space>
                            </div>
                        ),
                        children: test.hasWorksheet ? (
                            (test.status === 'COMPLETED' || test.status === 'AUTHORIZED' || actions.canReview || !actions.canEnterResults) ? (
                                <WorksheetReviewPanel sampleTestId={test.id} />
                            ) : (
                                <EmbeddableWorksheetEngine 
                                    sampleTestId={test.id} 
                                    readOnly={false} 
                                    onSubmitSuccess={() => {
                                        queryClient.invalidateQueries({ queryKey: ['sample-tests', id] });
                                        queryClient.invalidateQueries({ queryKey: ['sample', id] });
                                    }} 
                                />
                            )
                        ) : (
                            <div style={{ padding: 16 }}>
                                <Alert 
                                    message="No worksheet template available for this test." 
                                    type="info" 
                                />
                            </div>
                        )
                    }))}
                />
            ) : (
                <Empty description="No tests assigned" />
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
                    {actions.canDelete && (
                        <Popconfirm
                            title="Delete Sample"
                            description="Are you sure you want to delete this sample? This will also delete all associated test results."
                            onConfirm={() => deleteMutation.mutate(sample.id)}
                            okText="Yes"
                            cancelText="No"
                            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                        >
                            <Button danger icon={<DeleteOutlined />}>Delete</Button>
                        </Popconfirm>
                    )}
                    <Button
                        icon={<HistoryOutlined />}
                        onClick={() => setAuditVisible(true)}
                    >
                        History
                    </Button>
                    <div style={{ display: sample.status === 'AUTHORIZED' ? 'block' : 'none' }}>
                        <Button
                            type="primary"
                            icon={<FilePdfOutlined />}
                            onClick={handleDownloadCoa}
                        >
                            Download COA
                        </Button>
                    </div>
                </Space>
            </div>

            {actions.canReceive && (
                <Alert
                    message="This sample is awaiting intake"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                    action={
                        <IntakeActionPanel 
                            sampleId={sample.id} 
                            sampleNumber={sample.sampleNumber} 
                            productName={sample.productName} 
                            onSuccess={() => {}} 
                        />
                    }
                />
            )}

            {actions.canReview && (
                <Alert
                    message="All tests complete — awaiting review"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                    action={
                        <ReviewActionPanel 
                            sampleId={sample.id} 
                            sampleNumber={sample.sampleNumber} 
                            tests={tests || []} 
                            onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ['sample', id] });
                            }} 
                        />
                    }
                />
            )}

            {sample.status === 'REJECTED' && (
                <Alert
                    message="Sample rejected"
                    description={`Reason: ${sample.rejectionReason || 'No reason provided'}`}
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}

            <Card style={{ marginBottom: 24 }}>
                <Descriptions title="Metadata" bordered size="small">
                    <Descriptions.Item label="Client">{sample.clientName || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Product">{sample.productName}</Descriptions.Item>
                    <Descriptions.Item label="Condition">{sample.conditionOnReceipt}</Descriptions.Item>
                    <Descriptions.Item label="Received At">{sample.receivedAt ? dayjs(sample.receivedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Sampled At">{sample.sampledAt ? dayjs(sample.sampledAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Job Number">{sample.jobNumber || sample.sampleNumber?.split('-')[0] || ''}</Descriptions.Item>
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
