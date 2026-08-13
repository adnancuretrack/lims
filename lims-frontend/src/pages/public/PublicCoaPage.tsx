import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Result, Spin, Button, Typography, Space } from 'antd';
import { ExperimentOutlined, DownloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PublicCoaPage() {
    const { id } = useParams<{ id: string }>();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!id) {
            setError(true);
            setLoading(false);
            return;
        }

        let currentUrl: string | null = null;
        setLoading(true);
        setError(false);

        const fetchPublicCoa = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || '';
                const response = await fetch(`${apiBase}/api/public/coa/${id}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();
                currentUrl = window.URL.createObjectURL(blob);
                setPdfUrl(currentUrl);
            } catch (err) {
                console.error('Failed to load public COA:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicCoa();

        return () => {
            if (currentUrl) {
                window.URL.revokeObjectURL(currentUrl);
            }
        };
    }, [id]);

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `COA_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            {/* Header Bar with Company Branding */}
            <div style={{
                padding: '16px 24px',
                backgroundColor: '#0a1628',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}>
                <Space size="middle">
                    <ExperimentOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                    <div>
                        <Title level={4} style={{ margin: 0, color: '#fff', lineHeight: 1.2 }}>LIMS</Title>
                        <Text style={{ color: '#8c8c8c', fontSize: 12 }}>Official Certificate Verification System</Text>
                    </div>
                </Space>

                {pdfUrl && (
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                    >
                        Download Original PDF
                    </Button>
                )}
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {loading ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                        <Spin size="large" tip="Verifying Certificate of Analysis..." />
                    </div>
                ) : error || !pdfUrl ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
                        <Result
                            status="404"
                            title="Certificate Not Found or Not Authorized"
                            subTitle="The requested Certificate of Analysis could not be verified. It may be invalid, not yet authorized, or removed."
                        />
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                        <div style={{ padding: '8px 24px', backgroundColor: '#e6f4ff', borderBottom: '1px solid #91caff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Verified Authentic Document — Issued by Laboratory Information Management System
                            </Text>
                        </div>
                        <iframe
                            src={`${pdfUrl}#toolbar=0&navpanes=0`}
                            title={`COA Verification ${id}`}
                            style={{ width: '100%', flex: 1, border: 'none' }}
                        />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px', textAlign: 'center', backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    © {new Date().getFullYear()} LIMS. All rights reserved. For document authenticity inquiries, please contact your laboratory administrator.
                </Text>
            </div>
        </div>
    );
}
