import { useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Card, Space, Typography, Row, Col, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SampleService } from '../../api/SampleService';
import { ProjectService } from '../../api/ProjectService';
import type { SampleRegistrationRequest } from '../../api/types';

const { Title } = Typography;
const { Option } = Select;

export default function SampleRegisterPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: SampleService.getActiveClients,
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: SampleService.getActiveProducts,
    });

    const { data: projects, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects', selectedClientId],
        queryFn: () => selectedClientId ? ProjectService.getProjectsByClient(selectedClientId) : Promise.resolve([]),
        enabled: !!selectedClientId,
    });

    const mutation = useMutation({
        mutationFn: SampleService.register,
        onSuccess: () => {
            message.success('Samples registered successfully');
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            navigate('/samples');
        },
        onError: (error) => {
            message.error('Failed to register samples: ' + error);
        },
    });

    const onFinish = (values: any) => {
        const payload: SampleRegistrationRequest = {
            clientId: values.clientId,
            projectId: values.projectId,
            projectName: values.projectName, // Fallback if user types manually (if we allow it) or from project selection
            poNumber: values.poNumber,
            priority: values.priority,
            notes: values.notes,
            samples: values.samples.map((s: any) => ({
                productId: s.productId,
                description: s.description,
                samplingPoint: s.samplingPoint,
                sampledBy: s.sampledBy,
                sampledAt: s.sampledAt?.toISOString()
            }))
        };
        mutation.mutate(payload);
    };

    const handleClientChange = (value: number) => {
        setSelectedClientId(value);
        form.setFieldsValue({ projectId: undefined });
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Orchestrate New Job</Title>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ priority: 'NORMAL', samples: [{}] }}
            >
                <Card title="Job Details" style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
                                <Select
                                    placeholder="Select Client"
                                    loading={!clients}
                                    onChange={handleClientChange}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {clients?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="projectId"
                                label="Project"
                                help={selectedClientId && projects?.length === 0 ? "No projects found for this client" : null}
                            >
                                <Select
                                    placeholder={selectedClientId ? "Select Project" : "Select Client First"}
                                    loading={isLoadingProjects}
                                    disabled={!selectedClientId}
                                    allowClear
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {projects?.map(p => (
                                        <Option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="NORMAL">Normal</Option>
                                    <Option value="URGENT">Urgent</Option>
                                    <Option value="STAT">STAT (Immediate)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="poNumber" label="PO / Quotation Ref">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="notes" label="Notes / Instructions">
                                <Input.TextArea rows={1} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card title="Samples" style={{ marginBottom: 24 }}>
                    <Form.List name="samples">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', marginBottom: 8, alignItems: 'center' }}>
                                        <Space align="baseline" style={{ flex: 1 }}>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'productId']}
                                                rules={[{ required: true, message: 'Missing product' }]}
                                                style={{ width: 200 }}
                                            >
                                                <Select placeholder="Product" loading={!products}>
                                                    {products?.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'description']}
                                                style={{ width: 300 }}
                                            >
                                                <Input placeholder="Description" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'samplingPoint']}
                                                style={{ width: 150 }}
                                            >
                                                <Input placeholder="Sampling Point" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'sampledAt']}
                                            >
                                                <DatePicker showTime placeholder="Sampled At" />
                                            </Form.Item>
                                        </Space>
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', marginLeft: 8 }} />
                                    </div>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Add Sample
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Card>

                <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={mutation.isPending}>
                        Register Job
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
