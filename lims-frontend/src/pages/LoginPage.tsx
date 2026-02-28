import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

const { Title, Text } = Typography;

interface LoginFormValues {
    username: string;
    password: string;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const setAuth = useAuthStore((s) => s.setAuth);

    const onFinish = async (values: LoginFormValues) => {
        try {
            const response = await apiClient.post('/auth/login', values);
            const { token, username, displayName, roles } = response.data;
            setAuth(token, { username, displayName, roles });
            message.success(`Welcome, ${displayName}!`);
            navigate('/');
        } catch (err: unknown) {
            const error = err as { response?: { status?: number } };
            if (error.response?.status === 401 || error.response?.status === 403) {
                message.error('Invalid username or password');
            } else {
                message.error('Login failed — server unavailable');
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a1628 0%, #1a365d 50%, #2d3748 100%)',
        }}>
            <Card
                bordered={false}
                style={{
                    width: 400,
                    borderRadius: 12,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <ExperimentOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 12 }} />
                    <Title level={3} style={{ marginBottom: 4 }}>LIMS</Title>
                    <Text type="secondary">Laboratory Information Management System</Text>
                </div>

                <Form name="login" onFinish={onFinish} layout="vertical" size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Enter your username' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username" autoFocus />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Sign In</Button>
                    </Form.Item>
                </Form>

                <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
                    Dev credentials: admin / admin123
                </Text>
            </Card>
        </div>
    );
}
