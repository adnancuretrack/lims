import React, { useEffect, useState } from 'react';
import { Modal, Table, Typography, Tag, Space, Spin, Empty } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { AuditService } from '../../api/AuditService';
import type { AuditHistoryDTO } from '../../api/types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
    visible: boolean;
    onClose: () => void;
    entityType: string;
    entityId: number;
    title: string;
}

export const AuditTrailModal: React.FC<Props> = ({ visible, onClose, entityType, entityId, title }) => {
    const [history, setHistory] = useState<AuditHistoryDTO[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && entityId) {
            loadHistory();
        }
    }, [visible, entityId, entityType]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await AuditService.getHistory(entityType, entityId);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load audit trail', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Rev #',
            dataIndex: 'revisionNumber',
            key: 'rev',
            width: 80,
        },
        {
            title: 'Timestamp',
            dataIndex: 'revisionTimestamp',
            key: 'time',
            render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
        },
        {
            title: 'User',
            dataIndex: 'username',
            key: 'user',
            render: (val: string) => <Tag color="blue">{val}</Tag>,
        },
        {
            title: 'Summary',
            dataIndex: 'entityData',
            key: 'data',
            render: (data: any) => (
                <Text style={{ fontSize: 12 }}>
                    Status: <Tag>{data.status || 'N/A'}</Tag>
                    {data.numericValue !== undefined && ` | Value: ${data.numericValue}`}
                </Text>
            ),
        }
    ];

    return (
        <Modal
            title={<Space><HistoryOutlined /> Audit Trail: {title}</Space>}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="Loading history..." /></div>
            ) : history.length > 0 ? (
                <Table
                    dataSource={history}
                    columns={columns}
                    rowKey="revisionNumber"
                    size="small"
                    pagination={{ pageSize: 5 }}
                />
            ) : (
                <Empty description="No revision history found" />
            )}
        </Modal>
    );
};
