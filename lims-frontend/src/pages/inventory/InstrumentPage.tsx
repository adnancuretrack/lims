import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, Button, Modal, Form, Input, DatePicker, Select,
    message, Card, Tag, Typography, Space, Tooltip
} from 'antd';
import {
    PlusOutlined, EditOutlined, ToolOutlined,
    DeleteOutlined, CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import { InstrumentService } from '../../api/InstrumentService';
import type { InstrumentDTO, CreateInstrumentRequest } from '../../api/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const InstrumentPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<InstrumentDTO | null>(null);
    const [calibrationModalVisible, setCalibrationModalVisible] = useState(false);
    const [calibratingItem, setCalibratingItem] = useState<InstrumentDTO | null>(null);
    const [calibrationForm] = Form.useForm();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const { data: instruments, isLoading } = useQuery({
        queryKey: ['instruments'],
        queryFn: InstrumentService.list,
    });

    const createMutation = useMutation({
        mutationFn: InstrumentService.create,
        onSuccess: () => {
            message.success('Instrument registered successfully');
            queryClient.invalidateQueries({ queryKey: ['instruments'] });
            handleCancel();
        },
        onError: () => message.error('Failed to register instrument'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; request: CreateInstrumentRequest }) =>
            InstrumentService.update(data.id, data.request),
        onSuccess: () => {
            message.success('Instrument updated successfully');
            queryClient.invalidateQueries({ queryKey: ['instruments'] });
            handleCancel();
        },
        onError: () => message.error('Failed to update instrument'),
    });

    const calibrationMutation = useMutation({
        mutationFn: (data: { id: number; nextDate: string; by: string }) =>
            InstrumentService.calibrate(data.id, data.nextDate, data.by),
        onSuccess: () => {
            message.success('Calibration recorded');
            queryClient.invalidateQueries({ queryKey: ['instruments'] });
            setCalibrationModalVisible(false);
            setCalibratingItem(null);
            calibrationForm.resetFields();
        },
        onError: () => message.error('Failed to record calibration'),
    });

    const deactivateMutation = useMutation({
        mutationFn: InstrumentService.deactivate,
        onSuccess: () => {
            message.success('Instrument retired');
            queryClient.invalidateQueries({ queryKey: ['instruments'] });
        },
        onError: () => message.error('Failed to retire instrument'),
    });

    const handleCreate = () => {
        setEditingItem(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: InstrumentDTO) => {
        setEditingItem(record);
        form.setFieldsValue({
            ...record,
            calibrationDueDate: record.calibrationDueDate ? dayjs(record.calibrationDueDate) : null,
            lastCalibratedAt: record.lastCalibratedAt ? dayjs(record.lastCalibratedAt) : null,
        });
        setIsModalVisible(true);
    };

    const handleCalibrate = (record: InstrumentDTO) => {
        setCalibratingItem(record);
        calibrationForm.resetFields();
        // Default next due date to 1 year from now
        calibrationForm.setFieldsValue({
            nextCalibrationDate: dayjs().add(1, 'year'),
            calibratedBy: 'System User', // In real app, get from auth context
        });
        setCalibrationModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingItem(null);
        form.resetFields();
    };

    const onFinish = (values: any) => {
        const request: CreateInstrumentRequest = {
            ...values,
            calibrationDueDate: values.calibrationDueDate ? values.calibrationDueDate.format('YYYY-MM-DD') : null,
            lastCalibratedAt: values.lastCalibratedAt ? values.lastCalibratedAt.format('YYYY-MM-DD') : null,
        };
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, request });
        } else {
            createMutation.mutate(request);
        }
    };

    const onCalibrationFinish = (values: any) => {
        if (!calibratingItem) return;
        calibrationMutation.mutate({
            id: calibratingItem.id,
            nextDate: values.nextCalibrationDate.format('YYYY-MM-DD'),
            by: values.calibratedBy
        });
    };

    const columns = [
        {
            title: 'Instrument',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: InstrumentDTO) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.model}</Text>
                </Space>
            ),
        },
        {
            title: 'Serial No.',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            render: (text: string) => <Tag>{text}</Tag>,
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
        },
        {
            title: 'Calibration Due',
            dataIndex: 'calibrationDueDate',
            key: 'calibrationDueDate',
            render: (date: string, record: InstrumentDTO) => {
                if (!date) return <Text type="secondary">—</Text>;
                return record.calibrationOverdue ? (
                    <Tooltip title="Calibration Overdue!">
                        <Tag icon={<WarningOutlined />} color="red">{date}</Tag>
                    </Tooltip>
                ) : (
                    <Tag icon={<CheckCircleOutlined />} color="success">{date}</Tag>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    ACTIVE: 'green', MAINTENANCE: 'orange', RETIRED: 'red'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: InstrumentDTO) => (
                <Space>
                    <Tooltip title="Edit Details">
                        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    {record.active && (
                        <Tooltip title="Record Calibration">
                            <Button
                                type="link"
                                icon={<ToolOutlined />}
                                onClick={() => handleCalibrate(record)}
                            />
                        </Tooltip>
                    )}
                    {record.active && (
                        <Tooltip title="Retire Instrument">
                            <Button
                                type="link"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Retire Instrument',
                                        content: 'Are you sure you want to retire this instrument? This cannot be undone.',
                                        onOk: () => deactivateMutation.mutate(record.id)
                                    });
                                }}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Instruments</Title>
                        <Text type="secondary">Manage lab equipment and calibration schedules</Text>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        Register Instrument
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={instruments}
                    rowKey="id"
                    loading={isLoading}
                />
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                title={editingItem ? 'Edit Instrument' : 'Register Instrument'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={form.submit}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item name="name" label="Instrument Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. HPLC-01" />
                        </Form.Item>
                        <Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}>
                            <Input placeholder="e.g. SN-123456" disabled={!!editingItem} />
                        </Form.Item>
                        <Form.Item name="model" label="Model">
                            <Input placeholder="e.g. Agilent 1260" />
                        </Form.Item>
                        <Form.Item name="manufacturer" label="Manufacturer">
                            <Input placeholder="e.g. Agilent Technologies" />
                        </Form.Item>
                        <Form.Item name="location" label="Lab Location">
                            <Input placeholder="e.g. Wet Lab B" />
                        </Form.Item>
                        <Form.Item name="status" label="Status">
                            <Select>
                                <Select.Option value="ACTIVE">Active</Select.Option>
                                <Select.Option value="MAINTENANCE">Maintenance</Select.Option>
                                <Select.Option value="RETIRED">Retired</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="lastCalibratedAt" label="Last Calibrated">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="calibrationDueDate" label="Calibration Due">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* Calibration Modal */}
            <Modal
                title={`Record Calibration — ${calibratingItem?.name || ''}`}
                open={calibrationModalVisible}
                onCancel={() => { setCalibrationModalVisible(false); setCalibratingItem(null); }}
                onOk={calibrationForm.submit}
                confirmLoading={calibrationMutation.isPending}
                width={400}
            >
                <Form form={calibrationForm} layout="vertical" onFinish={onCalibrationFinish}>
                    <Form.Item
                        name="nextCalibrationDate"
                        label="Next Calibration Due"
                        rules={[{ required: true, message: 'Please set the next due date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="calibratedBy"
                        label="Calibrated By"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default InstrumentPage;
