import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, Switch, message, Card } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../../api/AdminService';
import type { UserDTO, CreateUserRequest } from '../../api/AdminService';

export default function UserManagementPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: AdminService.listUsers,
    });

    const { data: rolesList } = useQuery({
        queryKey: ['roles'],
        queryFn: AdminService.listRoles,
    });

    const createMutation = useMutation({
        mutationFn: AdminService.createUser,
        onSuccess: () => {
            message.success('User created successfully');
            closeModal();
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create user'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number, user: Partial<UserDTO> }) => AdminService.updateUser(data.id, data.user),
        onSuccess: () => {
            message.success('User updated successfully');
            closeModal();
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update user'),
    });

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (user: UserDTO) => {
        setEditingUser(user);
        form.setFieldsValue({
            ...user,
            password: '', // Don't fill password on edit
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        form.resetFields();
        setEditingUser(null);
    };

    const handleOk = () => {
        form.validateFields().then(values => {
            if (editingUser) {
                updateMutation.mutate({ id: editingUser.id, user: values });
            } else {
                createMutation.mutate(values as CreateUserRequest);
            }
        });
    };

    const columns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Display Name',
            dataIndex: 'displayName',
            key: 'displayName',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Roles',
            dataIndex: 'roles',
            key: 'roles',
            render: (roles: string[]) => (
                <>
                    {roles.map(role => (
                        <Tag color={role === 'ADMIN' ? 'red' : 'blue'} key={role}>
                            {role}
                        </Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active: boolean, record: UserDTO) => (
                <Switch
                    checked={active}
                    onChange={(checked) => updateMutation.mutate({ id: record.id, user: { active: checked } })}
                    size="small"
                />
            ),
        },
        {
            title: 'Last Login',
            dataIndex: 'lastLoginAt',
            key: 'lastLoginAt',
            render: (date: string) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: UserDTO) => (
                <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
            ),
        },
    ];

    return (
        <Card title="User Management" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add User</Button>}>
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={isLoading}
            />

            <Modal
                title={editingUser ? 'Edit User' : 'Create User'}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={closeModal}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                        <Input disabled={!!editingUser} prefix={<UserOutlined />} />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="roles" label="Roles" rules={[{ required: true }]}>
                        <Select mode="multiple" placeholder="Select roles">
                            {rolesList?.map(role => (
                                <Select.Option key={role} value={role}>{role}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
