import { Card, Col, Row, Statistic, Typography, Skeleton } from 'antd';
import {
    ExperimentOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    LineChartOutlined,
    AlertOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SampleService } from '../../api/SampleService';
import { QcApiService } from '../../api/QcApiService';
import { InvestigationService } from '../../api/InvestigationService';

const { Title } = Typography;

export default function DashboardPage() {
    const navigate = useNavigate();

    // Sample Stats
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: SampleService.getStats,
        refetchInterval: 30000,
    });

    // QC Violations (Last 7 days)
    const { data: qcViolations, isLoading: isLoadingQc } = useQuery({
        queryKey: ['dashboard', 'qcViolations'],
        queryFn: () => QcApiService.countRecentViolations(7),
        refetchInterval: 30000,
    });

    // Open Investigations
    const { data: openInvestigations, isLoading: isLoadingInv } = useQuery({
        queryKey: ['dashboard', 'openInvestigations'],
        queryFn: InvestigationService.getOpenCount,
        refetchInterval: 30000,
    });

    const isLoading = isLoadingStats || isLoadingQc || isLoadingInv;

    if (isLoading) {
        return (
            <div style={{ padding: 24 }}>
                <Skeleton active title={{ width: 200 }} paragraph={{ rows: 4 }} />
            </div>
        );
    }

    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>Dashboard</Title>

            <Row gutter={[16, 16]}>
                {/* Sample Stats */}
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/samples')}
                    >
                        <Statistic
                            title="Un-Received Samples"
                            value={stats?.unreceivedCount || 0}
                            prefix={<ExperimentOutlined />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/analysis')}
                    >
                        <Statistic
                            title="In Progress"
                            value={stats?.inProgressCount || 0}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/review')}
                    >
                        <Statistic
                            title="Awaiting Authorization"
                            value={stats?.awaitingAuthorizationCount || 0}
                            prefix={<WarningOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/analysis')}
                    >
                        <Statistic
                            title="Authorized Today"
                            value={stats?.authorizedTodayCount || 0}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>

                {/* New Modules */}
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/qc')}
                    >
                        <Statistic
                            title="QC Violations (7 Days)"
                            value={qcViolations || 0}
                            prefix={<LineChartOutlined />}
                            valueStyle={{ color: (qcViolations || 0) > 0 ? '#cf1322' : '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card
                        hoverable
                        bordered={false}
                        onClick={() => navigate('/investigations')}
                    >
                        <Statistic
                            title="Open Investigations"
                            value={openInvestigations || 0}
                            prefix={<AlertOutlined />}
                            valueStyle={{ color: (openInvestigations || 0) > 0 ? '#faad14' : '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
