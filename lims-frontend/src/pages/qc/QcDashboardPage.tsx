import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Menu, Card, Button, Modal, Form, Input, Select, InputNumber, Row, Col, Statistic, Table, Tag, Typography, message, Empty } from 'antd';
import { PlusOutlined, LineChartOutlined, CheckCircleOutlined, WarningOutlined, ExperimentOutlined } from '@ant-design/icons';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { QcApiService } from '../../api/QcApiService';
import { LookupService } from '../../api/LookupService';
import type { CreateQcChartRequest, AddDataPointRequest } from '../../api/QcApiService';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function QcDashboardPage() {
    const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [dataForm] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch list of charts
    const { data: charts } = useQuery({
        queryKey: ['qcCharts'],
        queryFn: QcApiService.listCharts,
    });

    // Fetch details for selected chart
    const { data: selectedChart } = useQuery({
        queryKey: ['qcChart', selectedChartId],
        queryFn: () => QcApiService.getChartWithData(parseInt(selectedChartId!, 10)),
        enabled: !!selectedChartId,
    });

    // Fetch stats for selected chart
    const { data: stats } = useQuery({
        queryKey: ['qcStats', selectedChartId],
        queryFn: () => QcApiService.getChartStats(parseInt(selectedChartId!, 10)),
        enabled: !!selectedChartId,
    });

    // Fetch test methods for create modal
    const { data: testMethods } = useQuery({
        queryKey: ['testMethods'],
        queryFn: LookupService.getAllTestMethods,
        enabled: isCreateModalOpen,
    });

    // Mutation: Create Chart
    const createChartMutation = useMutation({
        mutationFn: (values: CreateQcChartRequest) => QcApiService.createChart(values),
        onSuccess: () => {
            message.success('QC Chart created successfully');
            setIsCreateModalOpen(false);
            form.resetFields();
            queryClient.invalidateQueries({ queryKey: ['qcCharts'] });
        },
        onError: () => message.error('Failed to create QC chart'),
    });

    // Mutation: Add Data Point
    const addDataMutation = useMutation({
        mutationFn: (values: AddDataPointRequest) => QcApiService.addDataPoint(parseInt(selectedChartId!, 10), values),
        onSuccess: (data) => {
            if (data.violation) {
                message.error(`Westgard Violation detected: ${data.violationRule}`);
            } else {
                message.success('Data point added successfully');
            }
            setIsAddDataModalOpen(false);
            dataForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ['qcChart', selectedChartId] });
            queryClient.invalidateQueries({ queryKey: ['qcStats', selectedChartId] });
        },
        onError: () => message.error('Failed to add data point'),
    });

    // Custom dot for violations
    const CustomizedDot = (props: any) => {
        const { cx, cy, payload } = props;
        if (payload.violation) {
            return (
                <svg x={cx - 5} y={cy - 5} width={10} height={10} fill="red" viewBox="0 0 1024 1024">
                    <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
                    <path d="M464 688a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm24-112h48c4.4 0 8-3.6 8-8V296c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8z" />
                </svg>
            );
        }
        return <circle cx={cx} cy={cy} r={4} fill="#1890ff" />;
    };

    return (
        <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#fff' }}>
            <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={5} style={{ margin: 0 }}>QC Charts</Title>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)} />
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={selectedChartId ? [selectedChartId] : []}
                    onClick={({ key }) => setSelectedChartId(key)}
                    items={charts?.map((chart) => ({
                        key: String(chart.id),
                        icon: <LineChartOutlined />,
                        label: chart.name,
                    }))}
                    style={{ borderRight: 0 }}
                />
            </Sider>

            <Content style={{ padding: '24px', overflowY: 'auto' }}>
                {selectedChart ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <Title level={3} style={{ margin: 0 }}>{selectedChart.name}</Title>
                                <Text type="secondary">
                                    Method: {selectedChart.testMethodName} | Type: {selectedChart.chartType}
                                </Text>
                            </div>
                            <Button type="primary" onClick={() => setIsAddDataModalOpen(true)}>
                                Add Data Point
                            </Button>
                        </div>

                        {/* Statistics Cards */}
                        <Row gutter={16} style={{ marginBottom: 24 }}>
                            <Col span={6}>
                                <Card>
                                    <Statistic title="Mean" value={stats?.mean?.toFixed(4) || '-'} prefix={<ExperimentOutlined />} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic title="Std Dev" value={stats?.standardDeviation?.toFixed(4) || '-'} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic title="Cpk" value={stats?.cpk?.toFixed(2) || '-'} />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic
                                        title="Status"
                                        value={stats?.inControl ? 'In Control' : 'Out of Control'}
                                        valueStyle={{ color: stats?.inControl ? '#3f8600' : '#cf1322' }}
                                        prefix={stats?.inControl ? <CheckCircleOutlined /> : <WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {/* Control Chart */}
                        <Card title="X-bar Chart" style={{ marginBottom: 24 }}>
                            <div style={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={selectedChart.dataPoints}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="measuredAt"
                                            tickFormatter={(time) => dayjs(time).format('MM-DD HH:mm')}
                                        />
                                        <YAxis domain={['auto', 'auto']} />
                                        <RechartsTooltip
                                            labelFormatter={(label) => dayjs(label).format('YYYY-MM-DD HH:mm:ss')}
                                        />
                                        <Legend />

                                        {/* Limits Reference Lines */}
                                        {selectedChart.ucl && (
                                            <ReferenceLine y={selectedChart.ucl} label="UCL" stroke="red" strokeDasharray="3 3" />
                                        )}
                                        {selectedChart.lcl && (
                                            <ReferenceLine y={selectedChart.lcl} label="LCL" stroke="red" strokeDasharray="3 3" />
                                        )}
                                        {selectedChart.targetValue && (
                                            <ReferenceLine y={selectedChart.targetValue} label="Target" stroke="green" />
                                        )}
                                        {selectedChart.usl && (
                                            <ReferenceLine y={selectedChart.usl} label="USL" stroke="orange" strokeDasharray="3 3" />
                                        )}
                                        {selectedChart.lsl && (
                                            <ReferenceLine y={selectedChart.lsl} label="LSL" stroke="orange" strokeDasharray="3 3" />
                                        )}

                                        <Line
                                            type="monotone"
                                            dataKey="measuredValue"
                                            stroke="#1890ff"
                                            dot={<CustomizedDot />}
                                            activeDot={{ r: 8 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Recent Data Table */}
                        <Card title="Recent Data Points">
                            <Table
                                dataSource={selectedChart.dataPoints ? [...selectedChart.dataPoints].reverse() : []}
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                                size="small"
                                columns={[
                                    {
                                        title: 'Date',
                                        dataIndex: 'measuredAt',
                                        render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
                                    },
                                    {
                                        title: 'Value',
                                        dataIndex: 'measuredValue',
                                        render: (val) => val?.toFixed(4),
                                    },
                                    {
                                        title: 'Measured By',
                                        dataIndex: 'measuredByName',
                                    },
                                    {
                                        title: 'Violation',
                                        key: 'violation',
                                        render: (_, record) => record.violation ? (
                                            <Tag color="red">{record.violationRule}</Tag>
                                        ) : <Tag color="green">OK</Tag>,
                                    },
                                    {
                                        title: 'Notes',
                                        dataIndex: 'notes',
                                    },
                                ]}
                            />
                        </Card>
                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Empty description="Select a chart to view details" />
                    </div>
                )}
            </Content>

            {/* Create Chart Modal */}
            <Modal
                title="Create QC Chart"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createChartMutation.isPending}
            >
                <Form form={form} layout="vertical" onFinish={createChartMutation.mutate} initialValues={{ chartType: 'XBAR_R' }}>
                    <Form.Item name="name" label="Chart Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. pH Control Chart" />
                    </Form.Item>
                    <Form.Item name="testMethodId" label="Test Method" rules={[{ required: true }]}>
                        <Select placeholder="Select a test method" loading={!testMethods}>
                            {testMethods?.map(m => (
                                <Option key={m.id} value={m.id}>{m.name} ({m.code})</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="chartType" label="Chart Type">
                        <Select>
                            <Option value="XBAR_R">X-bar R Chart</Option>
                            <Option value="INDIVIDUAL">Individual Chart</Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="targetValue" label="Target">
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="ucl" label="UCL">
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lcl" label="LCL">
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="usl" label="USL (Spec Limit)">
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lsl" label="LSL (Spec Limit)">
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Add Data Point Modal */}
            <Modal
                title="Add Data Point"
                open={isAddDataModalOpen}
                onCancel={() => setIsAddDataModalOpen(false)}
                onOk={() => dataForm.submit()}
                confirmLoading={addDataMutation.isPending}
            >
                <Form form={dataForm} layout="vertical" onFinish={addDataMutation.mutate}>
                    <Form.Item name="measuredValue" label="Measured Value" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
}
