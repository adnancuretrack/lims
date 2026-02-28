import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Switch, message, Card, Tag, Typography, Select, Tooltip, Space } from 'antd';
import { PlusOutlined, EditOutlined, ExperimentOutlined } from '@ant-design/icons';
import { LookupService } from '../../api/LookupService';
import type { ProductDTO, TestMethodDTO } from '../../api/types';
import { useHasRole } from '../../hooks/useHasRole';

const { Title, Text } = Typography;

export const ProductListPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isTestsModalVisible, setIsTestsModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [testsForm] = Form.useForm();
    const isAdmin = useHasRole('ADMIN');

    const { data: products, isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: LookupService.getAllProducts
    });

    const { data: allTests } = useQuery({
        queryKey: ['testMethods'],
        queryFn: LookupService.getAllTestMethods,
        enabled: isTestsModalVisible
    });

    const { data: currentProductTests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['productTests', selectedProduct?.id],
        queryFn: () => LookupService.getProductTests(selectedProduct!.id),
        enabled: !!selectedProduct && isTestsModalVisible
    });

    const createMutation = useMutation({
        mutationFn: LookupService.createProduct,
        onSuccess: () => {
            message.success('Product created successfully');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCancel();
        },
        onError: () => message.error('Failed to create product')
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; product: Partial<ProductDTO> }) =>
            LookupService.updateProduct(data.id, data.product),
        onSuccess: () => {
            message.success('Product updated successfully');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCancel();
        },
        onError: () => message.error('Failed to update product')
    });

    const assignTestsMutation = useMutation({
        mutationFn: (testMethodIds: number[]) =>
            LookupService.assignProductTests(selectedProduct!.id, testMethodIds),
        onSuccess: () => {
            message.success('Tests assigned successfully');
            queryClient.invalidateQueries({ queryKey: ['productTests', selectedProduct?.id] });
            setIsTestsModalVisible(false);
            setSelectedProduct(null);
            testsForm.resetFields();
        },
        onError: () => message.error('Failed to assign tests')
    });

    const handleCreate = () => {
        setEditingProduct(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: ProductDTO) => {
        setEditingProduct(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleManageTests = (record: ProductDTO) => {
        setSelectedProduct(record);
        setIsTestsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingProduct(null);
        form.resetFields();
    };

    const onFinish = (values: any) => {
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, product: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleAssignTestsFinish = (values: { testIds: number[] }) => {
        assignTestsMutation.mutate(values.testIds);
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="orange">{text}</Tag>,
        },
        {
            title: 'Product Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (text: string) => text || '-',
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
            render: (_: any, record: ProductDTO) => (
                <Space>
                    <Tooltip title="Edit Product Info">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            disabled={!isAdmin}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Manage Tests">
                        <Button
                            type="text"
                            icon={<ExperimentOutlined />}
                            disabled={!isAdmin}
                            onClick={() => handleManageTests(record)}
                        >
                            Tests
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // Prepare initial values for tests form when data is loaded
    React.useEffect(() => {
        if (currentProductTests) {
            testsForm.setFieldsValue({
                testIds: currentProductTests.map(pt => pt.testMethodId)
            });
        }
    }, [currentProductTests, testsForm]);

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Products</Title>
                        <Text type="secondary">Manage materials and testing standards</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        disabled={!isAdmin}
                    >
                        Create Product
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={products}
                    rowKey="id"
                    loading={isLoading}
                />
            </Card>

            {/* Product Edit/Create Modal */}
            <Modal
                title={editingProduct ? "Edit Product" : "Create Product"}
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
                            label="Product Code"
                            rules={[{ required: true, message: 'Please enter product code' }]}
                        >
                            <Input placeholder="e.g. CONC-30" disabled={!!editingProduct} />
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="Product Name"
                            rules={[{ required: true, message: 'Please enter product name' }]}
                        >
                            <Input placeholder="e.g. 30 MPa Concrete" />
                        </Form.Item>

                        <Form.Item name="category" label="Category">
                            <Input placeholder="e.g. Concrete, Asphalt, Soil" />
                        </Form.Item>

                        <Form.Item name="samplingInstructions" label="Sampling Instructions" style={{ gridColumn: 'span 2' }}>
                            <Input.TextArea rows={3} placeholder="Instructions for field sampling" />
                        </Form.Item>

                        {editingProduct && (
                            <Form.Item name="active" label="Status" valuePropName="checked">
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* Test Assignment Modal */}
            <Modal
                title={`Assign Tests to ${selectedProduct?.name}`}
                open={isTestsModalVisible}
                onCancel={() => {
                    setIsTestsModalVisible(false);
                    setSelectedProduct(null);
                    testsForm.resetFields();
                }}
                onOk={testsForm.submit}
                confirmLoading={assignTestsMutation.isPending}
                width={500}
            >
                <Form form={testsForm} layout="vertical" onFinish={handleAssignTestsFinish}>
                    <Form.Item
                        name="testIds"
                        label="Select Tests"
                        help="Choose the tests that should be automatically assigned to samples of this product."
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select tests"
                            loading={isLoadingTests}
                            style={{ width: '100%' }}
                            optionFilterProp="children"
                        >
                            {allTests?.map((test: TestMethodDTO) => (
                                <Select.Option key={test.id} value={test.id}>
                                    {test.code} - {test.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProductListPage;
