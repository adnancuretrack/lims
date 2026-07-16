import { useState } from 'react';
import { Button, Space, Modal, Form, Select, message, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SampleService } from '../../api/SampleService';

const { Option } = Select;
const { Text } = Typography;

interface IntakeActionPanelProps {
    sampleId: number;
    sampleNumber: string;
    productName: string;
    onSuccess: () => void;
}

export function IntakeActionPanel({ sampleId, sampleNumber, productName, onSuccess }: IntakeActionPanelProps) {
    const queryClient = useQueryClient();
    const [receiveModalVisible, setReceiveModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [rejectForm] = Form.useForm();

    const receiveMutation = useMutation({
        mutationFn: (values: { condition: string }) =>
            SampleService.receiveSample(sampleId, { condition: values.condition }),
        onSuccess: () => {
            message.success('Sample received successfully');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['sample', sampleId] });
            setReceiveModalVisible(false);
            form.resetFields();
            onSuccess();
        },
        onError: (error: any) => message.error('Failed to receive sample: ' + error.message),
    });

    const rejectMutation = useMutation({
        mutationFn: (values: { reason: string }) =>
            SampleService.rejectSample(sampleId, { reason: values.reason }),
        onSuccess: () => {
            message.success('Sample rejected');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['sample', sampleId] });
            setRejectModalVisible(false);
            rejectForm.resetFields();
            onSuccess();
        },
        onError: (error: any) => message.error('Failed to reject sample: ' + error.message),
    });

    return (
        <>
            <Space>
                <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => setReceiveModalVisible(true)}
                    style={{ backgroundColor: '#52c41a' }}
                >
                    Receive Sample
                </Button>
                <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setRejectModalVisible(true)}
                >
                    Reject Sample
                </Button>
            </Space>

            {/* Receive Modal */}
            <Modal
                title="Receive Sample"
                open={receiveModalVisible}
                onCancel={() => setReceiveModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={receiveMutation.isPending}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Receiving Sample:</Text> <Text strong>{sampleNumber}</Text>
                    <br />
                    <Text type="secondary">Product:</Text> <Text>{productName}</Text>
                </div>
                <Form form={form} layout="vertical" onFinish={(v) => receiveMutation.mutate({ condition: v.condition })}>
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
                    <Text type="secondary">Rejecting Sample:</Text> <Text strong>{sampleNumber}</Text>
                </div>
                <Form form={rejectForm} layout="vertical" onFinish={(v) => rejectMutation.mutate({ reason: v.reason })}>
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
        </>
    );
}
