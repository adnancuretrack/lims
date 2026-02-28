import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Switch, message, Card, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { LookupService } from '../../api/LookupService';
import type { ClientDTO } from '../../api/types';
import { useHasRole } from '../../hooks/useHasRole';

const { Title, Text } = Typography;

export const ClientListPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientDTO | null>(null);
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const isAdmin = useHasRole('ADMIN');

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: LookupService.getAllClients
    });

    const createMutation = useMutation({
        mutationFn: LookupService.createClient,
        onSuccess: () => {
            message.success('Client created successfully');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            handleCancel();
        },
        onError: () => message.error('Failed to create client')
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; client: Partial<ClientDTO> }) =>
            LookupService.updateClient(data.id, data.client),
        onSuccess: () => {
            message.success('Client updated successfully');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            handleCancel();
        },
        onError: () => message.error('Failed to update client')
    });

    const handleCreate = () => {
        setEditingClient(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: ClientDTO) => {
        setEditingClient(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingClient(null);
        form.resetFields();
    };

    const onFinish = (values: any) => {
        if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, client: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Client Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: 'Contact Person',
            dataIndex: 'contactPerson',
            key: 'contactPerson',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'red'}>
                    {active ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: ClientDTO) => (
                <Button
                    type="link"
                    icon={<EditOutlined />}
                    disabled={!isAdmin}
                    onClick={() => handleEdit(record)}
                >
                    Edit
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Clients</Title>
                        <Text type="secondary">Manage customer and partner information</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        disabled={!isAdmin}
                    >
                        Create Client
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={clients}
                    rowKey="id"
                    loading={isLoading}
                />
            </Card>

            <Modal
                title={editingClient ? "Edit Client" : "Create Client"}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={form.submit}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            name="code"
                            label="Client Code"
                            rules={[{ required: true, message: 'Please enter client code' }]}
                        >
                            <Input placeholder="e.g. ACME" disabled={!!editingClient} />
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="Client Name"
                            rules={[{ required: true, message: 'Please enter client name' }]}
                        >
                            <Input placeholder="Full Client Name" />
                        </Form.Item>

                        <Form.Item name="contactPerson" label="Contact Person">
                            <Input placeholder="Contact Person Name" />
                        </Form.Item>

                        <Form.Item name="email" label="Email">
                            <Input type="email" placeholder="Contact Email" />
                        </Form.Item>

                        <Form.Item name="phone" label="Phone">
                            <Input placeholder="Contact Phone" />
                        </Form.Item>

                        <Form.Item name="address" label="Address" style={{ gridColumn: 'span 2' }}>
                            <Input.TextArea rows={3} placeholder="Full Address" />
                        </Form.Item>

                        {editingClient && (
                            <Form.Item name="active" label="Status" valuePropName="checked">
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        )}
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default ClientListPage;
