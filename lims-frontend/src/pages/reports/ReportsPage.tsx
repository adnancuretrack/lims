import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, Card, Table, Tag, Typography, Input, Button, message, Empty, Statistic, Row, Col, Tooltip, Progress } from 'antd';
import { DownloadOutlined, ClockCircleOutlined, TeamOutlined, WarningOutlined, FilePdfOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { ReportApiService } from '../../api/ReportApiService';
import type { TatReportDTO, WorkloadReportDTO, OverdueSampleDTO } from '../../api/ReportApiService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    REGISTERED: '#1890ff',
    RECEIVED: '#13c2c2',
    IN_PROGRESS: '#faad14',
    COMPLETED: '#722ed1',
    AUTHORIZED: '#52c41a',
    REJECTED: '#ff4d4f',
    CANCELLED: '#8c8c8c',
};

// ====== CoA Tab ======
function CoaTab() {
    const [sampleNumber, setSampleNumber] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (!sampleNumber.trim()) {
            message.warning('Please enter a sample number or sample ID');
            return;
        }

        setDownloading(true);
        try {
            // Parse as numeric ID (user can enter the numeric sample ID)
            const sampleId = parseInt(sampleNumber.trim(), 10);
            if (isNaN(sampleId)) {
                message.error('Please enter a valid numeric sample ID');
                return;
            }
            const blob = await ReportApiService.downloadCoa(sampleId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `COA_${sampleId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            message.success('Certificate of Analysis downloaded');
        } catch (e: any) {
            if (e.response?.status === 400 || e.response?.status === 500) {
                message.error('Failed to generate CoA. Ensure the sample is AUTHORIZED.');
            } else {
                message.error('Download failed. Please try again.');
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
                <Title level={4} style={{ marginBottom: 4 }}>Certificate of Analysis</Title>
                <Text type="secondary">
                    Download a finalized CoA PDF for an authorized sample.
                </Text>
            </div>
            <Input.Search
                placeholder="Enter Sample ID (e.g. 1)"
                enterButton={
                    <Button icon={<DownloadOutlined />} type="primary" loading={downloading}>
                        Download PDF
                    </Button>
                }
                size="large"
                value={sampleNumber}
                onChange={(e) => setSampleNumber(e.target.value)}
                onSearch={handleDownload}
            />
            <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Note: CoA can only be generated for samples with status <Tag color="green">AUTHORIZED</Tag>
                </Text>
            </div>
        </div>
    );
}

// ====== TAT Tab ======
function TatTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'tat'],
        queryFn: ReportApiService.getTatReport,
    });

    const totalSamples = data?.reduce((sum, row) => sum + row.count, 0) || 0;
    const overallAvgTat = data && data.length > 0
        ? data.reduce((sum, row) => sum + row.averageTatHours * row.count, 0) / totalSamples
        : 0;

    const columns = [
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={STATUS_COLORS[status] || '#8c8c8c'}>{status}</Tag>,
        },
        {
            title: 'Sample Count',
            dataIndex: 'count',
            key: 'count',
            sorter: (a: TatReportDTO, b: TatReportDTO) => a.count - b.count,
        },
        {
            title: 'Avg TAT (hrs)',
            dataIndex: 'averageTatHours',
            key: 'averageTatHours',
            render: (v: number) => v.toFixed(1),
            sorter: (a: TatReportDTO, b: TatReportDTO) => a.averageTatHours - b.averageTatHours,
        },
        {
            title: 'Min TAT (hrs)',
            dataIndex: 'minTatHours',
            key: 'minTatHours',
            render: (v: number) => v.toFixed(1),
        },
        {
            title: 'Max TAT (hrs)',
            dataIndex: 'maxTatHours',
            key: 'maxTatHours',
            render: (v: number) => v.toFixed(1),
        },
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Samples"
                            value={totalSamples}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Overall Avg TAT"
                            value={overallAvgTat.toFixed(1)}
                            suffix="hours"
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Status Groups"
                            value={data?.length || 0}
                        />
                    </Card>
                </Col>
            </Row>

            {data && data.length > 0 && (
                <Card title="Turnaround Time by Status" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="status" />
                            <YAxis label={{ value: 'Avg Hours', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip
                                formatter={(value: any) => [
                                    (value !== null && value !== undefined) ? `${Number(value).toFixed(1)} hrs` : '-',
                                    'Avg TAT'
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="averageTatHours" name="Avg TAT (hours)" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#8884d8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            <Card title="Detailed Breakdown">
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="status"
                    loading={isLoading}
                    pagination={false}
                    size="middle"
                />
            </Card>
        </div>
    );
}

// ====== Workload Tab ======
function WorkloadTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'workload'],
        queryFn: ReportApiService.getWorkloadReport,
    });

    const columns = [
        {
            title: 'Analyst',
            dataIndex: 'analystName',
            key: 'analystName',
            render: (name: string) => <Text strong>{name}</Text>,
        },
        {
            title: 'Samples Assigned',
            dataIndex: 'samplesAssigned',
            key: 'samplesAssigned',
            sorter: (a: WorkloadReportDTO, b: WorkloadReportDTO) => a.samplesAssigned - b.samplesAssigned,
        },
        {
            title: 'Tests Completed',
            dataIndex: 'testsCompleted',
            key: 'testsCompleted',
            render: (v: number) => <Tag color="green">{v}</Tag>,
        },
        {
            title: 'Tests Pending',
            dataIndex: 'testsPending',
            key: 'testsPending',
            render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v}</Tag>,
        },
        {
            title: 'Completion Rate',
            key: 'completionRate',
            render: (_: any, record: WorkloadReportDTO) => {
                const total = record.testsCompleted + record.testsPending;
                const pct = total > 0 ? Math.round((record.testsCompleted / total) * 100) : 0;
                return (
                    <Tooltip title={`${record.testsCompleted}/${total} tests`}>
                        <Progress
                            percent={pct}
                            size="small"
                            status={pct === 100 ? 'success' : 'active'}
                            style={{ width: 120 }}
                        />
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <div>
            {data && data.length > 0 && (
                <Card title="Tests per Analyst" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="analystName" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="testsCompleted" name="Completed" fill="#52c41a" stackId="a" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="testsPending" name="Pending" fill="#faad14" stackId="a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            <Card title="Analyst Workload Detail">
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="analystName"
                    loading={isLoading}
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: <Empty description="No workload data available. Assign tests to analysts to see data." /> }}
                />
            </Card>
        </div>
    );
}

// ====== Overdue Tab ======
function OverdueTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'overdue'],
        queryFn: ReportApiService.getOverdueReport,
    });

    const columns = [
        {
            title: 'Sample No',
            dataIndex: 'sampleNumber',
            key: 'sampleNumber',
            render: (text: string) => <Tag color="red">{text}</Tag>,
        },
        {
            title: 'Client',
            dataIndex: 'clientName',
            key: 'clientName',
        },
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={STATUS_COLORS[status] || '#8c8c8c'}>{status}</Tag>,
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
        },
        {
            title: 'Days Overdue',
            dataIndex: 'daysOverdue',
            key: 'daysOverdue',
            sorter: (a: OverdueSampleDTO, b: OverdueSampleDTO) => a.daysOverdue - b.daysOverdue,
            defaultSortOrder: 'descend' as const,
            render: (days: number) => (
                <Tag color={days > 7 ? 'red' : days > 3 ? 'orange' : 'gold'}>
                    {days} day{days !== 1 ? 's' : ''}
                </Tag>
            ),
        },
        {
            title: 'Assigned To',
            dataIndex: 'assignedTo',
            key: 'assignedTo',
        },
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={5} style={{ margin: 0 }}>
                        <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        {data?.length || 0} Overdue Sample{data?.length !== 1 ? 's' : ''}
                    </Title>
                </Col>
            </Row>
            <Table
                dataSource={data}
                columns={columns}
                rowKey="sampleId"
                loading={isLoading}
                pagination={{ pageSize: 20 }}
                size="middle"
                locale={{ emptyText: <Empty description="No overdue samples 🎉" /> }}
            />
        </Card>
    );
}

// ====== Main Reports Page ======
export default function ReportsPage() {
    const items = [
        {
            key: 'coa',
            label: (
                <span>
                    <FilePdfOutlined /> Certificate of Analysis
                </span>
            ),
            children: <CoaTab />,
        },
        {
            key: 'tat',
            label: (
                <span>
                    <ClockCircleOutlined /> Turnaround Time
                </span>
            ),
            children: <TatTab />,
        },
        {
            key: 'workload',
            label: (
                <span>
                    <TeamOutlined /> Analyst Workload
                </span>
            ),
            children: <WorkloadTab />,
        },
        {
            key: 'overdue',
            label: (
                <span>
                    <WarningOutlined /> Overdue Samples
                </span>
            ),
            children: <OverdueTab />,
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Reports</Title>
                <Text type="secondary">
                    Generate certificates, view turnaround time analytics, and track overdue samples.
                </Text>
            </div>
            <Card>
                <Tabs items={items} size="large" />
            </Card>
        </div>
    );
}
