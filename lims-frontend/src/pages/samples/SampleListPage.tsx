import { useNavigate } from 'react-router-dom';
import { Typography, Table, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const columns = [
    { title: 'Sample #', dataIndex: 'sampleNumber', key: 'sampleNumber' },
    { title: 'Product', dataIndex: 'product', key: 'product' },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Received', dataIndex: 'receivedAt', key: 'receivedAt' },
];

export default function SampleListPage() {
    const navigate = useNavigate();

    return (
        <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={3} style={{ marginBottom: 0 }}>Samples</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/samples/register')}>
                    Register Sample
                </Button>
            </Space>

            <Table
                columns={columns}
                dataSource={[]}
                bordered
                pagination={{ pageSize: 20, showSizeChanger: true }}
                locale={{ emptyText: 'No samples registered yet' }}
            />
        </div>
    );
}
