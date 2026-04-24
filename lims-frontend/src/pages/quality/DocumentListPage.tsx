import { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Upload, message, Typography, Popconfirm, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ComplianceDocumentService } from '../../api/ComplianceDocumentService';
import type { ComplianceDocumentDTO } from '../../api/types';
import { useHasRole } from '../../hooks/useHasRole';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function DocumentListPage() {
    const [documents, setDocuments] = useState<ComplianceDocumentDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    
    const isAdmin = useHasRole('ADMIN');

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await ComplianceDocumentService.list();
            setDocuments(data);
        } catch (error) {
            message.error('Failed to fetch documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (values: any) => {
        if (fileList.length === 0) {
            message.error('Please select a file to upload');
            return;
        }

        const file = fileList[0].originFileObj;
        setLoading(true);
        try {
            await ComplianceDocumentService.upload(file, values.description, values.category);
            message.success('Document uploaded successfully');
            setIsModalOpen(false);
            form.resetFields();
            setFileList([]);
            fetchDocuments();
        } catch (error) {
            message.error('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (record: ComplianceDocumentDTO) => {
        const hide = message.loading('Preparing download...', 0);
        try {
            const blob = await ComplianceDocumentService.download(record.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', record.fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success('Download started');
        } catch (error) {
            message.error('Download failed');
        } finally {
            hide();
        }
    };

    const handleView = async (record: ComplianceDocumentDTO) => {
        const hide = message.loading('Opening document...', 0);
        try {
            const blob = await ComplianceDocumentService.download(record.id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Note: We can't easily revoke the URL if the tab is still using it,
            // but for a single session it's usually fine.
        } catch (error) {
            message.error('Failed to open document');
        } finally {
            hide();
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await ComplianceDocumentService.delete(id);
            message.success('Document deleted');
            fetchDocuments();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const filteredDocs = documents.filter(doc => 
        doc.fileName.toLowerCase().includes(searchText.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchText.toLowerCase()))
    );

    const columns: ColumnsType<ComplianceDocumentDTO> = [
        {
            title: 'File Name',
            dataIndex: 'fileName',
            key: 'fileName',
            render: (text) => (
                <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{text}</Text>
                </Space>
            ),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (cat) => cat ? <Tag color="blue">{cat}</Tag> : <Text type="secondary">-</Text>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Size',
            dataIndex: 'fileSize',
            key: 'fileSize',
            render: (size) => `${(size / 1024).toFixed(1)} KB`,
        },
        {
            title: 'Uploaded At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="View">
                        <Button 
                            icon={<SearchOutlined />} 
                            onClick={() => handleView(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Download">
                        <Button 
                            icon={<DownloadOutlined />} 
                            onClick={() => handleDownload(record)}
                        />
                    </Tooltip>
                    {isAdmin && (
                        <Popconfirm
                            title="Are you sure you want to delete this document?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Yes"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Delete">
                                <Button icon={<DeleteOutlined />} danger />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={4}>Compliance Documents</Title>
                        <Text type="secondary">Manage SOPs, certifications, and quality documents</Text>
                    </div>
                    <Button 
                        type="primary" 
                        icon={<UploadOutlined />} 
                        onClick={() => setIsModalOpen(true)}
                    >
                        Upload Document
                    </Button>
                </div>
            </Card>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search by file name or description..."
                        prefix={<SearchOutlined />}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                    />
                </div>
                <Table 
                    columns={columns} 
                    dataSource={filteredDocs} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="Upload Compliance Document"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpload}
                >
                    <Form.Item
                        label="Document File"
                        required
                    >
                        <Upload
                            beforeUpload={() => false}
                            fileList={fileList}
                            onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                            maxCount={1}
                        >
                            <Button icon={<UploadOutlined />}>Select File</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Please select or enter a category' }]}
                    >
                        <Input placeholder="e.g. SOP, Certification, Manual" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea rows={3} placeholder="Brief description of the document" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Upload
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
