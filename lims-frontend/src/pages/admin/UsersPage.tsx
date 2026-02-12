import { Typography } from 'antd';

const { Title } = Typography;

export default function UsersPage() {
    return (
        <div>
            <Title level={3}>User Management</Title>
            <p>User registration, role assignment, and LDAP/AD integration config will be implemented here.</p>
        </div>
    );
}
