import { useState } from 'react';
import { Table, Button, Space, Card, Typography, Modal, Form, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO } from '../../api/types';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SampleReceivePage() {
    const queryClient = useQueryClient();
    const [receiveModalVisible, setReceiveModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedSample, setSelectedSample] = useState<SampleDTO | null>(null);
    const [form] = Form.useForm();
    const [rejectForm] = Form.useForm();

    const { data, isLoading } = useQuery({
        queryKey: ['samples', 'registered'],
        queryFn: async () => {
            const result = await SampleService.list(0, 100); // Get more for receiving queue
            return result.content.filter(s => s.status === 'REGISTERED');
        },
    });

    const receiveMutation = useMutation({
        mutationFn: (values: { id: number; condition: string }) =>
            SampleService.receiveSample(values.id, { condition: values.condition }),
        onSuccess: () => {
            message.success('Sample received successfully');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            setReceiveModalVisible(false);
            setSelectedSample(null);
            form.resetFields();
        },
        onError: (error: any) => message.error('Failed to receive sample: ' + error.message),
    });

    const rejectMutation = useMutation({
        mutationFn: (values: { id: number; reason: string }) =>
            SampleService.rejectSample(values.id, { reason: values.reason }),
        onSuccess: () => {
            message.success('Sample rejected');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            setRejectModalVisible(false);
            setSelectedSample(null);
            rejectForm.resetFields();
        },
        onError: (error: any) => message.error('Failed to reject sample: ' + error.message),
    });

    const handleReceive = (sample: SampleDTO) => {
        setSelectedSample(sample);
        setReceiveModalVisible(true);
    };

    const handleReject = (sample: SampleDTO) => {
        setSelectedSample(sample);
        setRejectModalVisible(true);
    };

    const columns: ColumnsType<SampleDTO> = [
        {
            title: 'Sample No.',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleReceive(record)}
                        style={{ backgroundColor: '#52c41a' }}
                    >
                        Receive
                    </Button>
                    <Button
                        danger
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleReject(record)}
                    >
                        Reject
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Title level={2}>Sample Intake (Receipt)</Title>
                <Text type="secondary">
                    Process incoming samples: verify condition and update status to RECEIVED or REJECTED.
                </Text>
            </div>

            <Card>
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 15 }}
                    locale={{ emptyText: 'No samples awaiting receipt.' }}
                />
            </Card>

            {/* Receive Modal */}
            <Modal
                title="Receive Sample"
                open={receiveModalVisible}
                onCancel={() => setReceiveModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={receiveMutation.isPending}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Receiving Sample:</Text> <Text strong>{selectedSample?.sampleNumber}</Text>
                    <br />
                    <Text type="secondary">Product:</Text> <Text>{selectedSample?.productName}</Text>
                </div>
                <Form form={form} layout="vertical" onFinish={(v) => receiveMutation.mutate({ id: selectedSample!.id, condition: v.condition })}>
                    <Form.Item
                        name="condition"
                        label="Condition on Receipt"
                        initialValue="ACCEPTABLE"
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value="ACCEPTABLE">Acceptable</Option>
                            <Option value="DAMAGED">Damaged / Leaking</Option>
                            <Option value="CONTAMINATED">Contaminated</Option>
                            <Option value="INSUFFICIENT">Insufficient Quantity</Option>
                            <Option value="TEMPERATURE_HIGH">Exceeded Temp Limit</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Reject Modal */}
            <Modal
                title="Reject Sample"
                open={rejectModalVisible}
                onCancel={() => setRejectModalVisible(false)}
                onOk={() => rejectForm.submit()}
                confirmLoading={rejectMutation.isPending}
                okText="Reject Sample"
                okButtonProps={{ danger: true }}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Rejecting Sample:</Text> <Text strong>{selectedSample?.sampleNumber}</Text>
                </div>
                <Form form={rejectForm} layout="vertical" onFinish={(v) => rejectMutation.mutate({ id: selectedSample!.id, reason: v.reason })}>
                    <Form.Item
                        name="reason"
                        label="Rejection Reason"
                        rules={[{ required: true, message: 'Please provide a reason' }]}
                    >
                        <Select placeholder="Select a reason">
                            <Option value="Label Dilapidated">Label Dilapidated / Illegible</Option>
                            <Option value="Sampler Uncertified">Sampler Not Certified</Option>
                            <Option value="Procedural Non-compliance">Procedural Non-compliance</Option>
                            <Option value="Contamination">Obvious Contamination</Option>
                            <Option value="Other">Other (specify in notes)</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
