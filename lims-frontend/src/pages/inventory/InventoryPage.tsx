import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker,
    message, Card, Tag, Typography, Space, Tooltip, Badge
} from 'antd';
import {
    PlusOutlined, EditOutlined, MinusCircleOutlined,
    PlusCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import { InventoryService } from '../../api/InventoryService';
import type { InventoryItemDTO, CreateInventoryItemRequest } from '../../api/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const InventoryPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItemDTO | null>(null);
    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [adjustItem, setAdjustItem] = useState<InventoryItemDTO | null>(null);
    const [adjustForm] = Form.useForm();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const { data: items, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: InventoryService.list,
    });

    const createMutation = useMutation({
        mutationFn: InventoryService.create,
        onSuccess: () => {
            message.success('Item created successfully');
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            handleCancel();
        },
        onError: () => message.error('Failed to create item'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; request: CreateInventoryItemRequest }) =>
            InventoryService.update(data.id, data.request),
        onSuccess: () => {
            message.success('Item updated successfully');
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            handleCancel();
        },
        onError: () => message.error('Failed to update item'),
    });

    const adjustMutation = useMutation({
        mutationFn: (data: { id: number; adjustment: number }) =>
            InventoryService.adjustStock(data.id, data.adjustment),
        onSuccess: () => {
            message.success('Stock adjusted');
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setAdjustModalVisible(false);
            setAdjustItem(null);
            adjustForm.resetFields();
        },
        onError: () => message.error('Failed to adjust stock'),
    });

    const handleCreate = () => {
        setEditingItem(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: InventoryItemDTO) => {
        setEditingItem(record);
        form.setFieldsValue({
            ...record,
            expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
        });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingItem(null);
        form.resetFields();
    };

    const handleAdjust = (record: InventoryItemDTO) => {
        setAdjustItem(record);
        adjustForm.resetFields();
        setAdjustModalVisible(true);
    };

    const onFinish = (values: any) => {
        const request: CreateInventoryItemRequest = {
            ...values,
            expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        };
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, request });
        } else {
            createMutation.mutate(request);
        }
    };

    const onAdjustFinish = (values: any) => {
        if (!adjustItem) return;
        adjustMutation.mutate({ id: adjustItem.id, adjustment: values.adjustment });
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (cat: string) => {
                const colors: Record<string, string> = {
                    CHEMICAL: 'purple', REAGENT: 'cyan', CONSUMABLE: 'orange', STANDARD: 'geekblue',
                };
                return <Tag color={colors[cat] || 'default'}>{cat}</Tag>;
            },
        },
        {
            title: 'Lot No.',
            dataIndex: 'lotNumber',
            key: 'lotNumber',
        },
        {
            title: 'Quantity',
            key: 'quantity',
            render: (_: unknown, record: InventoryItemDTO) => {
                const display = `${record.quantity} ${record.unit}`;
                return record.lowStock ? (
                    <Tooltip title="Below reorder level">
                        <Badge status="warning" />
                        <Text type="warning" strong> {display}</Text>
                    </Tooltip>
                ) : (
                    <Text>{display}</Text>
                );
            },
        },
        {
            title: 'Expiry',
            dataIndex: 'expiryDate',
            key: 'expiryDate',
            render: (date: string, record: InventoryItemDTO) => {
                if (!date) return <Text type="secondary">—</Text>;
                return record.expiringSoon ? (
                    <Tooltip title="Expiring within 30 days!">
                        <Tag icon={<WarningOutlined />} color="red">{date}</Tag>
                    </Tooltip>
                ) : (
                    <Text>{date}</Text>
                );
            },
        },
        {
            title: 'Location',
            dataIndex: 'storageLocation',
            key: 'storageLocation',
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
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: InventoryItemDTO) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Add Stock">
                        <Button
                            type="link"
                            icon={<PlusCircleOutlined />}
                            style={{ color: '#52c41a' }}
                            onClick={() => handleAdjust(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Deduct Stock">
                        <Button
                            type="link"
                            icon={<MinusCircleOutlined />}
                            style={{ color: '#faad14' }}
                            onClick={() => handleAdjust(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Inventory</Title>
                        <Text type="secondary">Manage chemicals, reagents, and consumables</Text>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        Add Item
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={items}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={form.submit}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item name="code" label="Item Code" rules={[{ required: true }]}>
                            <Input placeholder="e.g. H2SO4-01" disabled={!!editingItem} />
                        </Form.Item>
                        <Form.Item name="name" label="Item Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Sulfuric Acid" />
                        </Form.Item>
                        <Form.Item name="category" label="Category">
                            <Select placeholder="Select category" allowClear>
                                <Select.Option value="CHEMICAL">Chemical</Select.Option>
                                <Select.Option value="REAGENT">Reagent</Select.Option>
                                <Select.Option value="CONSUMABLE">Consumable</Select.Option>
                                <Select.Option value="STANDARD">Standard</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="lotNumber" label="Lot Number">
                            <Input placeholder="e.g. LOT-A123" />
                        </Form.Item>
                        <Form.Item name="supplier" label="Supplier">
                            <Input placeholder="Supplier name" />
                        </Form.Item>
                        <Form.Item name="quantity" label="Quantity">
                            <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder="0" />
                        </Form.Item>
                        <Form.Item name="unit" label="Unit">
                            <Select placeholder="Select unit" allowClear>
                                <Select.Option value="mL">mL</Select.Option>
                                <Select.Option value="L">L</Select.Option>
                                <Select.Option value="g">g</Select.Option>
                                <Select.Option value="kg">kg</Select.Option>
                                <Select.Option value="pcs">pcs</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="reorderLevel" label="Reorder Level">
                            <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder="0" />
                        </Form.Item>
                        <Form.Item name="expiryDate" label="Expiry Date">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="storageLocation" label="Storage Location">
                            <Input placeholder="e.g. Cold Room A" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* Stock Adjustment Modal */}
            <Modal
                title={`Adjust Stock — ${adjustItem?.name || ''}`}
                open={adjustModalVisible}
                onCancel={() => { setAdjustModalVisible(false); setAdjustItem(null); }}
                onOk={adjustForm.submit}
                confirmLoading={adjustMutation.isPending}
                width={400}
            >
                <Form form={adjustForm} layout="vertical" onFinish={onAdjustFinish}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        Current: {adjustItem?.quantity} {adjustItem?.unit}
                    </Text>
                    <Form.Item
                        name="adjustment"
                        label="Adjustment (+ to add, – to deduct)"
                        rules={[{ required: true, message: 'Enter adjustment amount' }]}
                    >
                        <InputNumber style={{ width: '100%' }} step={0.1} placeholder="e.g. 5 or -2.5" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default InventoryPage;
