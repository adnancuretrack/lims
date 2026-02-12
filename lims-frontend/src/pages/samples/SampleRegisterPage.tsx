import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography, Form, Input, Select, DatePicker, Button, Card, Row, Col,
    Space, Table, Checkbox, App,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Mock data — will come from API later
const mockClients = [
    { value: 1, label: 'Saudi Aramco' },
    { value: 2, label: 'SABIC' },
    { value: 3, label: 'Al-Rajhi Construction' },
    { value: 4, label: 'Saudi Binladin Group' },
];

const mockProducts = [
    { value: 1, label: 'Ordinary Portland Cement (OPC)' },
    { value: 2, label: 'Concrete Mix - Grade 40' },
    { value: 3, label: 'Fine Aggregate (Sand)' },
    { value: 4, label: 'Coarse Aggregate (Gravel)' },
    { value: 5, label: 'Reinforcing Steel Bar' },
    { value: 6, label: 'Asphalt Mix - Wearing Course' },
];

const mockDepartments = [
    { value: 1, label: 'Concrete & Cement' },
    { value: 2, label: 'Soil & Aggregates' },
    { value: 3, label: 'Asphalt & Bitumen' },
    { value: 4, label: 'Chemical Analysis' },
    { value: 5, label: 'Metals & Welding' },
];

// Mock tests per product
const mockTestsByProduct: Record<number, { id: number; name: string; standard: string; mandatory: boolean }[]> = {
    1: [
        { id: 1, name: 'Compressive Strength (2-day)', standard: 'ASTM C109', mandatory: true },
        { id: 2, name: 'Compressive Strength (28-day)', standard: 'ASTM C109', mandatory: true },
        { id: 3, name: 'Fineness (Blaine)', standard: 'ASTM C204', mandatory: true },
        { id: 4, name: 'Setting Time (Initial)', standard: 'ASTM C191', mandatory: true },
        { id: 5, name: 'Setting Time (Final)', standard: 'ASTM C191', mandatory: true },
        { id: 6, name: 'Soundness (Autoclave)', standard: 'ASTM C151', mandatory: false },
    ],
    2: [
        { id: 7, name: 'Compressive Strength (7-day)', standard: 'ASTM C39', mandatory: true },
        { id: 8, name: 'Compressive Strength (28-day)', standard: 'ASTM C39', mandatory: true },
        { id: 9, name: 'Slump Test', standard: 'ASTM C143', mandatory: true },
        { id: 10, name: 'Air Content', standard: 'ASTM C231', mandatory: false },
    ],
    3: [
        { id: 11, name: 'Sieve Analysis', standard: 'ASTM C136', mandatory: true },
        { id: 12, name: 'Specific Gravity', standard: 'ASTM C128', mandatory: true },
        { id: 13, name: 'Absorption', standard: 'ASTM C128', mandatory: true },
        { id: 14, name: 'Sand Equivalent', standard: 'ASTM D2419', mandatory: false },
    ],
    4: [
        { id: 15, name: 'Sieve Analysis', standard: 'ASTM C136', mandatory: true },
        { id: 16, name: 'Specific Gravity', standard: 'ASTM C127', mandatory: true },
        { id: 17, name: 'LA Abrasion', standard: 'ASTM C131', mandatory: true },
        { id: 18, name: 'Flakiness Index', standard: 'BS 812', mandatory: false },
    ],
    5: [
        { id: 19, name: 'Tensile Strength', standard: 'ASTM A370', mandatory: true },
        { id: 20, name: 'Yield Strength', standard: 'ASTM A370', mandatory: true },
        { id: 21, name: 'Elongation', standard: 'ASTM A370', mandatory: true },
        { id: 22, name: 'Bend Test', standard: 'ASTM A370', mandatory: true },
        { id: 23, name: 'Chemical Composition', standard: 'ASTM E415', mandatory: false },
    ],
    6: [
        { id: 24, name: 'Marshall Stability', standard: 'ASTM D6927', mandatory: true },
        { id: 25, name: 'Flow Value', standard: 'ASTM D6927', mandatory: true },
        { id: 26, name: 'Air Voids', standard: 'ASTM D3203', mandatory: true },
        { id: 27, name: 'Bulk Specific Gravity', standard: 'ASTM D2726', mandatory: true },
    ],
};

interface SampleRow {
    key: number;
    description: string;
    samplingPoint: string;
    productId: number | null;
    selectedTests: number[];
}

export default function SampleRegisterPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [samples, setSamples] = useState<SampleRow[]>([
        { key: 1, description: '', samplingPoint: '', productId: null, selectedTests: [] },
    ]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([1]);

    const addSampleRow = () => {
        const newKey = Math.max(...samples.map(s => s.key), 0) + 1;
        const newRow: SampleRow = { key: newKey, description: '', samplingPoint: '', productId: null, selectedTests: [] };
        setSamples([...samples, newRow]);
        setExpandedRowKeys([...expandedRowKeys, newKey]);
    };

    const removeSampleRow = (key: number) => {
        if (samples.length === 1) return;
        setSamples(samples.filter(s => s.key !== key));
        setExpandedRowKeys(expandedRowKeys.filter(k => k !== key));
    };

    const updateSample = (key: number, field: keyof SampleRow, value: unknown) => {
        setSamples(samples.map(s => {
            if (s.key !== key) return s;
            const updated = { ...s, [field]: value };
            // Auto-select mandatory tests when product changes
            if (field === 'productId' && typeof value === 'number') {
                const tests = mockTestsByProduct[value] || [];
                updated.selectedTests = tests.filter(t => t.mandatory).map(t => t.id);
            }
            return updated;
        }));
    };

    const handleSubmit = () => {
        form.validateFields().then(values => {
            const payload = { ...values, samples };
            console.log('Registration payload:', payload);
            message.success(`${samples.length} sample(s) registered successfully!`);
            navigate('/samples');
        });
    };

    const sampleColumns: ColumnsType<SampleRow> = [
        {
            title: '#',
            width: 50,
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Product',
            dataIndex: 'productId',
            width: 250,
            render: (value, record) => (
                <Select
                    style={{ width: '100%' }}
                    placeholder="Select product"
                    options={mockProducts}
                    value={value}
                    onChange={(v) => updateSample(record.key, 'productId', v)}
                />
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            render: (value, record) => (
                <Input
                    placeholder="e.g. Batch #2024-0156"
                    value={value}
                    onChange={(e) => updateSample(record.key, 'description', e.target.value)}
                />
            ),
        },
        {
            title: 'Sampling Point',
            dataIndex: 'samplingPoint',
            width: 200,
            render: (value, record) => (
                <Input
                    placeholder="e.g. Plant mixer"
                    value={value}
                    onChange={(e) => updateSample(record.key, 'samplingPoint', e.target.value)}
                />
            ),
        },
        {
            title: 'Tests',
            width: 80,
            align: 'center' as const,
            render: (_, record) => (
                <Text type="secondary">
                    {record.selectedTests.length}
                </Text>
            ),
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                samples.length > 1 ? (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeSampleRow(record.key)}
                        size="small"
                    />
                ) : null
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/samples')}>Back</Button>
                <Title level={3} style={{ marginBottom: 0 }}>Register New Samples</Title>
            </Space>

            <Card bordered={false} style={{ marginBottom: 16 }}>
                <Title level={5} style={{ marginTop: 0 }}>Job Information</Title>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Client" name="clientId" rules={[{ required: true, message: 'Select a client' }]}>
                                <Select placeholder="Select client" options={mockClients} showSearch optionFilterProp="label" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Project Name" name="projectName">
                                <Input placeholder="e.g. King Abdullah Financial District" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="PO Number" name="poNumber">
                                <Input placeholder="e.g. PO-2024-0891" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Priority" name="priority" initialValue="NORMAL">
                                <Select options={[
                                    { value: 'URGENT', label: '🔴 Urgent' },
                                    { value: 'HIGH', label: '🟠 High' },
                                    { value: 'NORMAL', label: '🟢 Normal' },
                                    { value: 'LOW', label: '⚪ Low' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Department" name="departmentId" rules={[{ required: true, message: 'Select department' }]}>
                                <Select placeholder="Select department" options={mockDepartments} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Sampled By" name="sampledBy">
                                <Input placeholder="Name of person who collected samples" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Sampling Date" name="sampledAt">
                                <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} showTime />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={16}>
                            <Form.Item label="Notes" name="notes">
                                <TextArea rows={1} placeholder="Any special instructions or observations" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card
                bordered={false}
                title="Samples"
                extra={
                    <Button type="dashed" icon={<PlusOutlined />} onClick={addSampleRow}>
                        Add Sample
                    </Button>
                }
            >
                <Table
                    columns={sampleColumns}
                    dataSource={samples}
                    pagination={false}
                    rowKey="key"
                    expandable={{
                        expandedRowKeys,
                        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as number[]),
                        expandedRowRender: (record) => {
                            const tests = record.productId ? (mockTestsByProduct[record.productId] || []) : [];
                            if (!record.productId) {
                                return <Text type="secondary" italic>Select a product to see available tests</Text>;
                            }
                            return (
                                <div style={{ padding: '8px 0' }}>
                                    <Text strong style={{ marginBottom: 8, display: 'block' }}>
                                        Select Tests ({record.selectedTests.length} of {tests.length} selected)
                                    </Text>
                                    <Checkbox.Group
                                        value={record.selectedTests}
                                        onChange={(checked) => updateSample(record.key, 'selectedTests', checked)}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {tests.map(test => (
                                            <Checkbox key={test.id} value={test.id}>
                                                <Space>
                                                    <Text>{test.name}</Text>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>({test.standard})</Text>
                                                    {test.mandatory && <Text type="warning" style={{ fontSize: 11 }}>Required</Text>}
                                                </Space>
                                            </Checkbox>
                                        ))}
                                    </Checkbox.Group>
                                </div>
                            );
                        },
                    }}
                />
            </Card>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => navigate('/samples')}>Cancel</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} size="large">
                    Register {samples.length} Sample{samples.length > 1 ? 's' : ''}
                </Button>
            </div>
        </div>
    );
}
