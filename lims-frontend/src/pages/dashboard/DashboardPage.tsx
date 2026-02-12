import { Card, Col, Row, Statistic, Typography } from 'antd';
import {
    ExperimentOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

export default function DashboardPage() {
    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>Dashboard</Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Un-Received Samples"
                            value={0}
                            prefix={<ExperimentOutlined />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="In Progress"
                            value={0}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Awaiting Authorization"
                            value={0}
                            prefix={<WarningOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Authorized Today"
                            value={0}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
