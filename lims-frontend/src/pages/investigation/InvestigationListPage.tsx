import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Button, Input, Tag, Typography, Radio, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { InvestigationService } from '../../api/InvestigationService';
import type { InvestigationDTO } from '../../api/InvestigationService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'blue',
    INVESTIGATING: 'orange',
    CORRECTIVE_ACTION: 'purple',
    CLOSED: 'green',
};

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: 'red',
    MAJOR: 'orange',
    MINOR: 'default',
};

export default function InvestigationListPage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'ALL' | 'MY'>('ALL');
    const [searchText, setSearchText] = useState('');

    const { data: investigations, isLoading } = useQuery({
        queryKey: ['investigations', viewMode],
        queryFn: viewMode === 'ALL'
            ? InvestigationService.getAllInvestigations
            : InvestigationService.getMyInvestigations,
    });

    const filteredData = investigations?.filter(item =>
        item.ncrNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        item.status.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'NCR #',
            dataIndex: 'ncrNumber',
            key: 'ncrNumber',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            key: 'severity',
            render: (severity: string) => (
                <Tag color={SEVERITY_COLORS[severity]}>{severity}</Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={STATUS_COLORS[status]}>{status.replace('_', ' ')}</Tag>
            ),
        },
        {
            title: 'Assigned To',
            dataIndex: 'assignedToName',
            key: 'assignedToName',
            render: (name: string) => name || <Text type="secondary">Unassigned</Text>,
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: InvestigationDTO) => (
                <Tooltip title="View Details">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/investigations/${record.id}`)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Investigations</Title>
                    <Text type="secondary">Manage Non-Conformance Reports (NCR) and CAPA workflows</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/investigations/new')}>
                    New Investigation
                </Button>
            </div>

            <Card>
                <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="ALL">All Investigations</Radio.Button>
                        <Radio.Button value="MY">My Investigations</Radio.Button>
                    </Radio.Group>

                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search by Number, Title, or Status"
                        style={{ width: 300 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />
                </div>

                <Table
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
}
