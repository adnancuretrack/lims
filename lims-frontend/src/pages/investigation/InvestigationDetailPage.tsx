import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Card, Row, Col, Typography, Steps, Divider, message, Tag, DatePicker, Spin } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { InvestigationService } from '../../api/InvestigationService';
import { SampleService } from '../../api/SampleService';
import type { SampleDTO } from '../../api/types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function InvestigationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new' || !id;
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch investigation details (if viewing existing)
    const { data: investigation, isLoading } = useQuery({
        queryKey: ['investigation', id],
        queryFn: () => InvestigationService.getInvestigation(parseInt(id!, 10)),
        enabled: !isNew,
    });

    // Fetch samples for the dropdown
    const { data: samples, isLoading: isLoadingSamples } = useQuery({
        queryKey: ['samplesLookup'],
        queryFn: () => SampleService.listAll(),
    });

    // Fetch users for assignment (reusing GetAllClients sort of for structure, but actually need users. 
    // We don't have a specific getAllUsers in LookupService public API, usually user lists are admin only. 
    // For now, I'll rely on assignedToId if it exists, or skip fetching all users to avoid admin dependency.
    // Ideally we'd have a 'getAssignableUsers' endpoint, but for now let's just use text input or skip re-assignment if not admin.
    // Actually, let's use the /api/admin/users if I have access, or just leave it readonly for non-admins.
    // Wait, create/update DTO has assignedToId. Let's assume we can't easily change it without a user list.
    // I'll skip the user dropdown for now and let it be set on create if implemented, or just show readonly if complex.
    // Update: UserManagementPage uses AdminService.getAllUsers. Let's see if I can import AdminService.

    // Mutation: Create
    const createMutation = useMutation({
        mutationFn: InvestigationService.createInvestigation,
        onSuccess: () => {
            message.success('Investigation created successfully');
            navigate('/investigations');
        },
        onError: () => message.error('Failed to create investigation'),
    });

    // Mutation: Update
    const updateMutation = useMutation({
        mutationFn: (values: any) => InvestigationService.updateInvestigation(parseInt(id!, 10), values),
        onSuccess: () => {
            message.success('Investigation updated successfully');
            queryClient.invalidateQueries({ queryKey: ['investigation', id] });
        },
        onError: () => message.error('Failed to update investigation'),
    });

    useEffect(() => {
        if (investigation) {
            form.setFieldsValue({
                ...investigation,
                dueDate: investigation.dueDate ? dayjs(investigation.dueDate) : null,
            });
        }
    }, [investigation, form]);

    const handleFinish = (values: any) => {
        const payload = {
            ...values,
            dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
        };

        if (isNew) {
            createMutation.mutate(payload);
        } else {
            updateMutation.mutate(payload);
        }
    };

    const getStepCurrent = (status: string) => {
        switch (status) {
            case 'OPEN': return 0;
            case 'INVESTIGATING': return 1;
            case 'CORRECTIVE_ACTION': return 2;
            case 'CLOSED': return 3;
            default: return 0;
        }
    };

    if (isLoading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
            <Button
                icon={<ArrowLeftOutlined />}
                style={{ marginBottom: 16 }}
                onClick={() => navigate('/investigations')}
            >
                Back to List
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {isNew ? 'New Investigation' : `Investigation ${investigation?.ncrNumber}`}
                </Title>
                {!isNew && <Tag color="blue">{investigation?.status}</Tag>}
            </div>

            {!isNew && (
                <Card style={{ marginBottom: 24 }}>
                    <Steps
                        current={getStepCurrent(investigation?.status || 'OPEN')}
                        items={[
                            { title: 'Open', description: 'Issue Reported' },
                            { title: 'Investigating', description: 'Root Cause Analysis' },
                            { title: 'Corrective Action', description: 'CAPA Implementation' },
                            { title: 'Closed', description: 'Verified & Complete' },
                        ]}
                    />
                </Card>
            )}

            <Card title="Investigation Details">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    initialValues={{ type: 'NCR', severity: 'MINOR', status: 'OPEN' }}
                    disabled={investigation?.status === 'CLOSED'}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="title" label="Title / Issue Summary" rules={[{ required: true }]}>
                                <Input placeholder="Brief summary of the issue" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="NCR">NCR (Non-Conformance)</Option>
                                    <Option value="CAPA">CAPA</Option>
                                    <Option value="COMPLAINT">Complaint</Option>
                                    <Option value="DEVIATION">Deviation</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="CRITICAL">Critical</Option>
                                    <Option value="MAJOR">Major</Option>
                                    <Option value="MINOR">Minor</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="relatedSampleId" label="Related Sample">
                                <Select
                                    showSearch
                                    placeholder="Select a sample"
                                    optionFilterProp="children"
                                    loading={isLoadingSamples}
                                    allowClear
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={samples?.map((s: SampleDTO) => ({
                                        value: s.id,
                                        label: `${s.sampleNumber} (${s.productName})`
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="dueDate" label="Due Date">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Detailed Description" rules={[{ required: true }]}>
                        <TextArea rows={4} placeholder="Describe the non-conformance or issue in detail..." />
                    </Form.Item>

                    <Divider>Analysis & Action</Divider>

                    <Form.Item name="rootCause" label="Root Cause Analysis">
                        <TextArea rows={3} placeholder="What caused this issue?" />
                    </Form.Item>

                    <Form.Item name="correctiveAction" label="Corrective Action">
                        <TextArea rows={3} placeholder="Actions taken to fix the immediate issue" />
                    </Form.Item>

                    <Form.Item name="preventiveAction" label="Preventive Action">
                        <TextArea rows={3} placeholder="Actions to prevent recurrence" />
                    </Form.Item>

                    {!isNew && (
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="status" label="Current Status" rules={[{ required: true }]}>
                                    <Select>
                                        <Option value="OPEN">Open</Option>
                                        <Option value="INVESTIGATING">Investigating</Option>
                                        <Option value="CORRECTIVE_ACTION">Corrective Action</Option>
                                        <Option value="CLOSED">Closed</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createMutation.isPending || updateMutation.isPending}>
                            {isNew ? 'Create Investigation' : 'Save Changes'}
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
