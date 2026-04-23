import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Card, Typography, Row, Col, Tag, Button, Empty, Form, message, Layout, Divider, Space, Alert } from 'antd';
import { 
  ExperimentOutlined, 
  FormOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AnalysisService } from '../../api/AnalysisService';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO, SampleTestDTO, ResultEntryRequest } from '../../api/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

export default function ResultEntryPage() {
    const [selectedSample, setSelectedSample] = useState<SampleDTO | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch received samples (the queue)
    const { data: queue, isLoading: isLoadingQueue } = useQuery({
        queryKey: ['analysisQueue'],
        queryFn: () => SampleService.list()
    });



    const activeQueue = queue?.content.filter((s: SampleDTO) => s.status === 'RECEIVED' || s.status === 'IN_PROGRESS') || [];

    // Fetch tests for selected sample
    const { data: tests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['sampleTests', selectedSample?.id],
        queryFn: () => AnalysisService.getSampleTests(selectedSample!.id),
        enabled: !!selectedSample
    });

    const enterResultMutation = useMutation({
        mutationFn: AnalysisService.enterResult,
        onSuccess: () => {
            message.success('Result saved');
            queryClient.invalidateQueries({ queryKey: ['sampleTests', selectedSample?.id] });
            queryClient.invalidateQueries({ queryKey: ['analysisQueue'] });
        },
        onError: () => message.error('Failed to save result')
    });

    const handleEnterResult = (testId: number, values: any) => {
        const request: ResultEntryRequest = {
            sampleTestId: testId,
            instrumentId: values.instrumentId,
            reagentLot: values.reagentLot
        };
        enterResultMutation.mutate(request);
    };

    const queueColumns = [
        {
            title: 'Sample No',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
            render: (text: string) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
            ellipsis: true
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'RECEIVED' ? 'cyan' : 'orange'}>{status}</Tag>
            )
        }
    ];

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
            <Sider width={400} theme="light" style={{ borderRight: '1px solid #d9d9d9', overflowY: 'auto' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <Title level={4} style={{ margin: 0 }}>Work Queue</Title>
                    <Text type="secondary">Samples awaiting testing</Text>
                </div>
                <Table
                    dataSource={activeQueue}
                    columns={queueColumns}
                    rowKey="id"
                    loading={isLoadingQueue}
                    pagination={false}
                    onRow={(record: SampleDTO) => ({
                        onClick: () => setSelectedSample(record),
                        style: { cursor: 'pointer', background: selectedSample?.id === record.id ? '#e6f4ff' : 'inherit' }
                    })}
                />
            </Sider>
            <Content style={{ padding: '24px', overflowY: 'auto' }}>
                {selectedSample ? (
                    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                        <Card bordered={false}>
                            <Row gutter={24} align="middle">
                                <Col flex="auto">
                                    <Title level={3} style={{ margin: 0 }}>
                                        {selectedSample.sampleNumber}
                                    </Title>
                                    <Text type="secondary">{selectedSample.productName} | {selectedSample.description}</Text>
                                </Col>
                                <Col>
                                    <Space size="large">
                                        <div>
                                            <Text type="secondary" style={{ display: 'block' }}>Status</Text>
                                            <Tag color="cyan">{selectedSample.status}</Tag>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ display: 'block' }}>Received At</Text>
                                            <Text strong>{dayjs(selectedSample.receivedAt).format('YYYY-MM-DD HH:mm')}</Text>
                                        </div>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>

                        <Divider>Assigned Tests</Divider>

                        {isLoadingTests ? (
                            <Card loading />
                        ) : tests && tests.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {tests.map((test: SampleTestDTO) => (
                                    <Col span={24} key={test.id}>
                                        <Card
                                            size="small"
                                            title={
                                                <Space>
                                                    <ExperimentOutlined />
                                                    {test.testMethodName}
                                                    <Text type="secondary">({test.testMethodCode})</Text>
                                                </Space>
                                            }
                                            extra={<Tag color={test.status === 'COMPLETED' ? 'green' : 'gold'}>{test.status}</Tag>}
                                        >
                                            <Form
                                                layout="inline"
                                                initialValues={{
                                                    instrumentId: test.instrumentId,
                                                    reagentLot: test.reagentLot
                                                }}
                                                onFinish={(values) => handleEnterResult(test.id, values)}
                                            >
                                                 {test.hasWorksheet ? (
                                                    <div style={{ padding: '8px 0', width: '100%' }}>
                                                        <Button 
                                                            type="primary" 
                                                            ghost
                                                            icon={<FormOutlined />}
                                                            onClick={() => navigate(`/worksheets/${test.id}`)}
                                                        >
                                                            {test.status === 'COMPLETED' || test.status === 'AUTHORIZED' ? 'View Worksheet' : 'Open Worksheet'}
                                                        </Button>
                                                        <Text type="secondary" style={{ marginLeft: 16 }}>
                                                            Runs through the Method Designer blueprint
                                                        </Text>
                                                    </div>
                                                 ) : (
                                                     <Alert 
                                                        message="No worksheet template available for this method. Please configure it in the Method Designer." 
                                                        type="warning" 
                                                        showIcon 
                                                     />
                                                 )}
                                            </Form>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Empty description="No tests assigned to this sample" />
                        )}
                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                        <Empty description="Select a sample from the queue to start entering results" />
                    </div>
                )}
            </Content>
        </Layout>
    );
}
