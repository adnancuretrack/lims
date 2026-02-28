import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Card, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { ProjectService } from '../../api/ProjectService';
import type { ProjectDTO } from '../../api/ProjectService';
import { SampleService } from '../../api/SampleService';
import { useHasRole } from '../../hooks/useHasRole';

const { Title, Text } = Typography;

export const ProjectListPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const isAdmin = useHasRole('ADMIN');

    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: ProjectService.getAllProjects
    });

    const { data: clients } = useQuery({
        queryKey: ['activeClients'],
        queryFn: SampleService.getActiveClients
    });

    const createMutation = useMutation({
        mutationFn: ProjectService.createProject,
        onSuccess: () => {
            message.success('Project created successfully');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            handleCancel();
        },
        onError: () => message.error('Failed to create project')
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; project: Partial<ProjectDTO> }) =>
            ProjectService.updateProject(data.id, data.project),
        onSuccess: () => {
            message.success('Project updated successfully');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            handleCancel();
        },
        onError: () => message.error('Failed to update project')
    });

    const handleCreate = () => {
        setEditingProject(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: ProjectDTO) => {
        setEditingProject(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingProject(null);
        form.resetFields();
    };

    const onFinish = (values: any) => {
        if (editingProject) {
            updateMutation.mutate({ id: editingProject.id, project: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const columns = [
        {
            title: 'Project No',
            dataIndex: 'projectNumber',
            key: 'projectNumber',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: 'Client',
            dataIndex: 'clientName',
            key: 'clientName',
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
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
            render: (_: any, record: ProjectDTO) => (
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
                        <Title level={4} style={{ margin: 0 }}>Projects</Title>
                        <Text type="secondary">Manage client projects</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        disabled={!isAdmin}
                    >
                        Create Project
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={projects}
                    rowKey="id"
                    loading={isLoading}
                />
            </Card>

            <Modal
                title={editingProject ? "Edit Project" : "Create Project"}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={form.submit}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item name="clientName" hidden><Input /></Form.Item>

                        <Form.Item
                            name="clientId"
                            label="Client"
                            rules={[{ required: true, message: 'Please select a client' }]}
                        >
                            <Select
                                placeholder="Select Client"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                }
                                disabled={!!editingProject} // Prevent changing client for now
                            >
                                {clients?.map(client => (
                                    <Select.Option key={client.id} value={client.id}>{client.name}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="projectNumber"
                            label="Project Number"
                            rules={[{ required: true, message: 'Please enter project number' }]}
                        >
                            <Input placeholder="e.g. P-2023-001" disabled={!!editingProject} />
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="Project Name"
                            rules={[{ required: true, message: 'Please enter project name' }]}
                            style={{ gridColumn: 'span 2' }}
                        >
                            <Input placeholder="Project Name" />
                        </Form.Item>

                        <Form.Item name="location" label="Location">
                            <Input placeholder="Project Location" />
                        </Form.Item>

                        <Form.Item name="owner" label="Owner">
                            <Input placeholder="Project Owner" />
                        </Form.Item>

                        <Form.Item name="consultant" label="Consultant">
                            <Input placeholder="Consultant" />
                        </Form.Item>

                        <Form.Item name="contractor" label="Contractor">
                            <Input placeholder="Contractor" />
                        </Form.Item>

                        <Form.Item name="contactPerson" label="Contact Person">
                            <Input placeholder="Contact Person" />
                        </Form.Item>

                        <Form.Item name="email" label="Email">
                            <Input type="email" placeholder="Email" />
                        </Form.Item>

                        <Form.Item name="phone" label="Phone">
                            <Input placeholder="Phone" />
                        </Form.Item>

                        {editingProject && (
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

export default ProjectListPage;
