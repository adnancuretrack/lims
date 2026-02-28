import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Card, Typography, Row, Col, Tag, Button, Empty, message, Layout, Divider, Space, Modal, Input } from 'antd';
import { SafetyCertificateOutlined, CloseCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import { AnalysisService } from '../../api/AnalysisService';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO, SampleTestDTO, ResultReviewRequest } from '../../api/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { TextArea } = Input;

export default function ReviewQueuePage() {
    const [selectedSample, setSelectedSample] = useState<SampleDTO | null>(null);
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [reviewAction, setReviewAction] = useState<'AUTHORIZE' | 'REJECT' | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const queryClient = useQueryClient();

    const { data: queue, isLoading: isLoadingQueue } = useQuery({
        queryKey: ['reviewQueue'],
        queryFn: () => SampleService.list()
    });

    const awaitingReview = queue?.content.filter((s: SampleDTO) => s.status === 'COMPLETED') || [];

    // Fetch tests for selected sample
    const { data: tests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['sampleTests', selectedSample?.id],
        queryFn: () => AnalysisService.getSampleTests(selectedSample!.id),
        enabled: !!selectedSample
    });

    const reviewMutation = useMutation({
        mutationFn: AnalysisService.reviewResult,
        onSuccess: () => {
            message.success(`Result ${reviewAction?.toLowerCase()}d successfully`);
            queryClient.invalidateQueries({ queryKey: ['sampleTests', selectedSample?.id] });
            queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
            setIsReviewModalVisible(false);
            setReviewComment('');
        },
        onError: () => message.error('Failed to complete review')
    });

    const handleReviewClick = (action: 'AUTHORIZE' | 'REJECT') => {
        setReviewAction(action);
        setIsReviewModalVisible(true);
    };

    const submitReview = () => {
        if (!selectedSample || !tests) return;

        // In this simplified version, we review the sample's results. 
        // We'll process the first test result for now or extend to multi-result.
        // Usually, you review individual test results.
        const completedTests = tests.filter(t => t.status === 'COMPLETED');

        if (completedTests.length === 0) {
            message.warning('No completed tests found to review');
            return;
        }

        // Apply action to all completed tests for this sample
        completedTests.forEach(test => {
            if (test.testResultId) {
                const request: ResultReviewRequest = {
                    testResultId: test.testResultId,
                    action: reviewAction!,
                    comment: reviewComment
                };
                reviewMutation.mutate(request);
            }
        });
    };

    const queueColumns = [
        {
            title: 'Sample No',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
            render: (text: string) => <Tag color="orange">{text}</Tag>
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
        }
    ];

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
            <Sider width={400} theme="light" style={{ borderRight: '1px solid #d9d9d9', overflowY: 'auto' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <Title level={4} style={{ margin: 0 }}>Review Queue</Title>
                    <Text type="secondary">Samples awaiting authorization</Text>
                </div>
                <Table
                    dataSource={awaitingReview}
                    columns={queueColumns}
                    rowKey="id"
                    loading={isLoadingQueue}
                    pagination={false}
                    onRow={(record) => ({
                        onClick: () => setSelectedSample(record),
                        style: { cursor: 'pointer', background: selectedSample?.id === record.id ? '#fff7e6' : 'inherit' }
                    })}
                />
            </Sider>
            <Content style={{ padding: '24px', overflowY: 'auto' }}>
                {selectedSample ? (
                    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                        <Card bordered={false} extra={
                            <Space>
                                <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    onClick={() => handleReviewClick('REJECT')}
                                >
                                    Reject Changes
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SafetyCertificateOutlined />}
                                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                    onClick={() => handleReviewClick('AUTHORIZE')}
                                >
                                    Authorize Sample
                                </Button>
                            </Space>
                        }>
                            <Row gutter={24} align="middle">
                                <Col flex="auto">
                                    <Title level={3} style={{ margin: 0 }}>
                                        Review: {selectedSample.sampleNumber}
                                    </Title>
                                    <Text type="secondary">{selectedSample.productName}</Text>
                                </Col>
                                <Col>
                                    <Tag color="orange">{selectedSample.status}</Tag>
                                </Col>
                            </Row>
                        </Card>

                        <Divider>Technical Results</Divider>

                        {isLoadingTests ? (
                            <Card loading />
                        ) : tests && tests.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {tests.map((test: SampleTestDTO) => (
                                    <Col span={24} key={test.id}>
                                        <Card
                                            size="small"
                                            className={test.isOutOfRange ? 'oos-card' : ''}
                                            title={
                                                <Space>
                                                    <ExperimentOutlined />
                                                    {test.testMethodName}
                                                </Space>
                                            }
                                        >
                                            <Row gutter={16}>
                                                <Col span={6}>
                                                    <Text type="secondary" style={{ display: 'block' }}>Result</Text>
                                                    <Text strong>
                                                        {test.numericValue ?? test.textValue ?? '-'} {test.unit}
                                                    </Text>
                                                </Col>
                                                <Col span={6}>
                                                    <Text type="secondary" style={{ display: 'block' }}>Specification</Text>
                                                    <Text>{test.minLimit ?? '-'} to {test.maxLimit ?? '-'} {test.unit}</Text>
                                                </Col>
                                                <Col span={6}>
                                                    <Text type="secondary" style={{ display: 'block' }}>Compliance</Text>
                                                    {test.isOutOfRange ? (
                                                        <Tag color="red">OUT OF SPEC</Tag>
                                                    ) : (
                                                        <Tag color="green">PASS</Tag>
                                                    )}
                                                </Col>
                                                <Col span={6}>
                                                    <Text type="secondary" style={{ display: 'block' }}>Status</Text>
                                                    <Tag color="blue">{test.status}</Tag>
                                                </Col>
                                            </Row>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Empty description="No data found" />
                        )}
                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                        <Empty description="Select a sample from the review queue" />
                    </div>
                )}
            </Content>

            <Modal
                title={reviewAction === 'AUTHORIZE' ? "Confirm Authorization" : "Reject Results"}
                open={isReviewModalVisible}
                onOk={submitReview}
                onCancel={() => setIsReviewModalVisible(false)}
                okText={reviewAction === 'AUTHORIZE' ? "Authorize" : "Reject"}
                okButtonProps={{
                    danger: reviewAction === 'REJECT',
                    style: reviewAction === 'AUTHORIZE' ? { background: '#52c41a', borderColor: '#52c41a' } : {}
                }}
                confirmLoading={reviewMutation.isPending}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>
                        {reviewAction === 'AUTHORIZE'
                            ? "You are about to authorize these results as technically valid."
                            : "Please provide a reason for rejection. This will return the sample for re-testing."}
                    </Text>
                </div>
                <TextArea
                    rows={4}
                    placeholder="Add comments or justification..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                />
            </Modal>
        </Layout>
    );
}
