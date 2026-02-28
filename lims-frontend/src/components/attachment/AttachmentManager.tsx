import React, { useEffect, useState } from 'react';
import { List, Button, Upload, message, Space, Typography, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { AttachmentService } from '../../api/AttachmentService';
import type { AttachmentDTO } from '../../api/types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
    sampleId?: number;
    jobId?: number;
}

export const AttachmentManager: React.FC<Props> = ({ sampleId, jobId }) => {
    const [attachments, setAttachments] = useState<AttachmentDTO[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAttachments();
    }, [sampleId, jobId]);

    const loadAttachments = async () => {
        if (!sampleId && !jobId) return;
        setLoading(true);
        try {
            if (sampleId) {
                const data = await AttachmentService.listForSample(sampleId);
                setAttachments(data);
            }
        } catch (error) {
            console.error('Failed to load attachments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (options: any) => {
        const { file, onSuccess, onError } = options;
        try {
            if (sampleId) {
                const newAttr = await AttachmentService.uploadForSample(sampleId, file as File);
                setAttachments(prev => [newAttr, ...prev]);
                onSuccess("OK");
                message.success('File uploaded successfully');
            }
        } catch (error) {
            message.error('Upload failed');
            onError(error);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>Documents & Attachments</Typography.Title>
                <Upload customRequest={handleUpload} showUploadList={false}>
                    <Button icon={<UploadOutlined />}>Upload File</Button>
                </Upload>
            </div>

            <List
                loading={loading}
                dataSource={attachments}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Button
                                icon={<DownloadOutlined />}
                                href={AttachmentService.downloadLink(item.id)}
                                target="_blank"
                                size="small"
                            >
                                Download
                            </Button>
                        ]}
                    >
                        <List.Item.Meta
                            avatar={<FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                            title={<Text strong>{item.fileName}</Text>}
                            description={
                                <Space split={<Text type="secondary" style={{ fontSize: 11 }}>|</Text>}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{item.fileType}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{formatSize(item.fileSize)}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Uploaded by <Tag color="blue">{item.uploadedBy}</Tag> {dayjs(item.createdAt).fromNow()}
                                    </Text>
                                </Space>
                            }
                        />
                    </List.Item>
                )}
            />
        </div>
    );
};
