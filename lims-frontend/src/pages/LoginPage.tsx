import { Button, Card, Form, Input, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
    const onFinish = (values: { username: string; password: string }) => {
        console.log('Login:', values);
        // TODO: integrate with /api/auth/login
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 0, color: '#1677ff' }}>LIMS</Title>
                    <Text type="secondary">Laboratory Information Management System</Text>
                </Space>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    style={{ marginTop: 32 }}
                >
                    <Form.Item name="username" rules={[{ required: true, message: 'Enter your username' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                    </Form.Item>

                    <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block>
                            Sign In
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
