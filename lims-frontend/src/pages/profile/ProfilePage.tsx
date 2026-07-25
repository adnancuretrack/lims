import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, Alert, Space, Typography, Tag, message } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '../../api/ProfileService';
import type { UpdateProfileRequest } from '../../api/ProfileService';
import { useAuthStore } from '../../store/authStore';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;

export default function ProfilePage() {
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const { updateUser } = useAuthStore();
    const queryClient = useQueryClient();
    
    // Using a key to force rerender of image on update
    const [signatureKey, setSignatureKey] = useState(Date.now());

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: ProfileService.getProfile,
    });

    useEffect(() => {
        if (profile) {
            form.setFieldsValue({
                displayName: profile.displayName,
                email: profile.email,
                phone: profile.phone,
                username: profile.username,
            });
            // Update auth store with latest info to keep header in sync
            updateUser({
                displayName: profile.displayName,
                email: profile.email,
                phone: profile.phone
            });
        }
    }, [profile, form, updateUser]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: UpdateProfileRequest) => ProfileService.updateProfile(data),
        onSuccess: (data) => {
            message.success('Profile updated successfully');
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            updateUser({
                displayName: data.displayName,
                email: data.email,
                phone: data.phone
            });
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Failed to update profile');
        }
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: UpdateProfileRequest) => ProfileService.updateProfile(data),
        onSuccess: () => {
            message.success('Password changed successfully');
            passwordForm.resetFields();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Failed to change password');
        }
    });

    const uploadSignatureMutation = useMutation({
        mutationFn: (file: File) => ProfileService.uploadSignature(file),
        onSuccess: () => {
            message.success('Signature uploaded successfully');
            setSignatureKey(Date.now()); // force image reload
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Failed to upload signature');
        }
    });

    const onProfileSave = (values: any) => {
        updateProfileMutation.mutate({
            displayName: values.displayName,
            email: values.email,
            phone: values.phone
        });
    };

    const onPasswordChange = (values: any) => {
        changePasswordMutation.mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword
        });
    };

    const beforeUpload = (file: File) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG file!');
            return false;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Image must smaller than 5MB!');
            return false;
        }

        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const image = new Image();
                image.src = e.target?.result as string;
                image.onload = () => {
                    const width = image.width;
                    const height = image.height;
                    
                    if (width < 100 || height < 30) {
                        message.error('Image dimensions below minimum required size (100x30)');
                        reject();
                    } else if (height > width) {
                        message.error('Image must be landscape oriented');
                        reject();
                    } else {
                        // Pass validation
                        uploadSignatureMutation.mutate(file);
                        resolve();
                    }
                };
            };
        }).then(() => false, () => Upload.LIST_IGNORE); // Prevent default upload behavior since we handle it manually
    };

    const uploadProps: UploadProps = {
        beforeUpload,
        showUploadList: false,
        accept: '.png,.jpg,.jpeg'
    };

    if (isLoading || !profile) {
        return <div style={{ padding: 24 }}>Loading profile...</div>;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32 }}>
                    <UserOutlined />
                </div>
                <div>
                    <Title level={3} style={{ margin: 0 }}>{profile.displayName}</Title>
                    <Space size={[0, 8]} wrap style={{ marginTop: 8 }}>
                        <Tag color="default">@{profile.username}</Tag>
                        {profile.roles.map(r => (
                            <Tag color={r === 'ADMIN' ? 'red' : 'blue'} key={r}>{r}</Tag>
                        ))}
                    </Space>
                </div>
            </div>

            <Card title="Profile Details" style={{ marginBottom: 24 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onProfileSave}
                >
                    <Form.Item label="Username">
                        <Input name="username" value={profile.username} disabled />
                    </Form.Item>
                    
                    <Form.Item 
                        name="displayName" 
                        label="Display Name" 
                        rules={[{ required: true, message: 'Display name is required' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item 
                        name="email" 
                        label="Email Address" 
                        rules={[{ type: 'email', message: 'Enter a valid email' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item 
                        name="phone" 
                        label="Phone Number" 
                    >
                        <Input />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={updateProfileMutation.isPending}>
                        Save Profile
                    </Button>
                </Form>
            </Card>

            <Card title="Change Password" style={{ marginBottom: 24 }}>
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={onPasswordChange}
                >
                    <Form.Item 
                        name="currentPassword" 
                        label="Current Password" 
                        rules={[{ required: true, message: 'Current password is required' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item 
                        name="newPassword" 
                        label="New Password" 
                        rules={[{ required: true, message: 'New password is required' }, { min: 6, message: 'Password must be at least 6 characters' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item 
                        name="confirmPassword" 
                        label="Confirm New Password" 
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Please confirm your new password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('The two passwords do not match!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={changePasswordMutation.isPending}>
                        Change Password
                    </Button>
                </Form>
            </Card>

            <Card title="Digital Signature">
                <Alert 
                    type="info" 
                    showIcon 
                    message="Signature Guidelines" 
                    description="Your signature image will be placed on certification templates (COA). High-resolution images are preferred and will be scaled down automatically to fit the certificate design. Please ensure the signature fills the image edge-to-edge with minimal padding around it. Crop any excess whitespace before uploading. Accepted formats: PNG or JPG. Max file size: 5MB. Min size: 100x30 pixels. Aspect ratio must be landscape."
                    style={{ marginBottom: 16 }}
                />

                <div style={{ marginBottom: 16 }}>
                    <Text strong>Current Signature:</Text>
                    <div style={{ marginTop: 8, padding: 16, background: '#f5f5f5', border: '1px dashed #d9d9d9', borderRadius: 8, display: 'inline-block', minWidth: 200, minHeight: 80, textAlign: 'center' }}>
                        {profile.hasSignature ? (
                            <img 
                                src={`${ProfileService.getSignatureUrl()}?t=${signatureKey}`} 
                                alt="Digital Signature" 
                                style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                            />
                        ) : (
                            <Text type="secondary" style={{ lineHeight: '48px' }}>No signature uploaded</Text>
                        )}
                    </div>
                </div>

                <Space>
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />} loading={uploadSignatureMutation.isPending}>
                            Upload New Signature
                        </Button>
                    </Upload>
                </Space>
            </Card>
        </div>
    );
}
