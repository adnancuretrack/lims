import React, { useEffect, useState } from 'react';
import { Badge, Popover, List, Typography, Space, Button, Empty, message } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { NotificationService } from '../../api/NotificationService';
import { socketService } from '../../api/SocketService';
import type { NotificationDTO } from '../../api/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Initial fetch
        loadNotifications();

        // Connect to WebSocket
        socketService.connect((newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            message.info(`New Notification: ${newNotif.title}`);
        });

        return () => socketService.disconnect();
    }, []);

    const loadNotifications = async () => {
        try {
            const list = await NotificationService.list();
            setNotifications(list);
            const count = await NotificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await NotificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            message.error('Failed to mark as read');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'ALERT': return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'OOS': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
            default: return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const content = (
        <div style={{ width: 350 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Title level={5} style={{ margin: 0 }}>Notifications</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>{unreadCount} unread</Text>
            </div>
            <List
                dataSource={notifications.slice(0, 10)}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" /> }}
                renderItem={(item) => (
                    <List.Item
                        style={{
                            background: item.read ? 'transparent' : '#f0f7ff',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: 4,
                            marginBottom: 4
                        }}
                        onClick={() => !item.read && handleMarkAsRead(item.id)}
                    >
                        <List.Item.Meta
                            avatar={getTypeIcon(item.type)}
                            title={
                                <Space>
                                    <Text strong={!item.read}>{item.title}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {dayjs(item.createdAt).fromNow()}
                                    </Text>
                                </Space>
                            }
                            description={<Text type="secondary" style={{ fontSize: 12 }}>{item.message}</Text>}
                        />
                    </List.Item>
                )}
            />
            {notifications.length > 10 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Button type="link" size="small">View All</Button>
                </div>
            )}
        </div>
    );

    return (
        <Popover content={content} trigger="click" placement="bottomRight">
            <Badge count={unreadCount} offset={[-2, 10]} size="small">
                <Button
                    type="text"
                    icon={<BellOutlined style={{ fontSize: 20 }} />}
                    style={{ color: '#fff' }}
                />
            </Badge>
        </Popover>
    );
};
