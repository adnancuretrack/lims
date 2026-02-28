import { useState } from 'react';
import { Table, Button, Card, Typography, Modal, Form, Input, Select, InputNumber, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LookupService } from '../../api/LookupService';
import type { TestMethodDTO } from '../../api/types';

const { Title } = Typography;
const { Option } = Select;

export default function TestMethodListPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TestMethodDTO | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: testMethods, isLoading } = useQuery({
        queryKey: ['testMethods'],
        queryFn: LookupService.getAllTestMethods,
    });

    const mutation = useMutation({
        mutationFn: (values: any) => {
            if (editingRecord) {
                return LookupService.updateTestMethod(editingRecord.id, values);
            }
            return LookupService.createTestMethod(values);
        },
        onSuccess: () => {
            message.success(`Test method ${editingRecord ? 'updated' : 'created'} successfully`);
            setIsModalOpen(false);
            form.resetFields();
            setEditingRecord(null);
            queryClient.invalidateQueries({ queryKey: ['testMethods'] });
        },
        onError: () => {
            message.error('Failed to save test method');
        },
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
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                        setEditingRecord(record);
                        form.setFieldsValue(record);
                        setIsModalOpen(true);
                    }}
                />
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
                    onClick={() => {
                        setEditingRecord(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
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

            <Modal
                title={`${editingRecord ? 'Edit' : 'Add'} Test Method`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={mutation.isPending}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={mutation.mutate}
                    initialValues={{ active: true, resultType: 'QUANTITATIVE', decimalPlaces: 2, tatHours: 24 }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                        <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                            <Input placeholder="e.g. ASTM-C39" />
                        </Form.Item>
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Compressive Strength" />
                        </Form.Item>
                        <Form.Item name="standardRef" label="Standard Reference">
                            <Input placeholder="e.g. ASTM C39 / C39M" />
                        </Form.Item>
                        <Form.Item name="resultType" label="Result Type" rules={[{ required: true }]}>
                            <Select>
                                <Option value="QUANTITATIVE">Quantitative (Numeric)</Option>
                                <Option value="PASS_FAIL">Pass / Fail</Option>
                                <Option value="TEXT">Free Text</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="unit" label="Unit">
                            <Input placeholder="e.g. MPa, kg, %" />
                        </Form.Item>
                        <Form.Item name="decimalPlaces" label="Decimal Places">
                            <InputNumber min={0} max={6} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="minLimit" label="Min Limit (Plausibility)">
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="maxLimit" label="Max Limit (Plausibility)">
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="tatHours" label="TAT (Hours)">
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="active" label="Status" valuePropName="checked">
                            <Select>
                                <Option value={true}>Active</Option>
                                <Option value={false}>Inactive</Option>
                            </Select>
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
