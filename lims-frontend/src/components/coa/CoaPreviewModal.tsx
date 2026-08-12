import React, { useEffect, useState } from 'react';
import { Modal, Spin, Button, message, Space } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { SampleService } from '../../api/SampleService';

interface Props {
    visible: boolean;
    onClose: () => void;
    sampleId: number;
    sampleNumber: string;
}

export const CoaPreviewModal: React.FC<Props> = ({ visible, onClose, sampleId, sampleNumber }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && sampleId) {
            loadPdf();
        } else {
            // Clean up object URL when modal closes
            if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        }
        
        return () => {
            if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [visible, sampleId]);

    const loadPdf = async () => {
        setLoading(true);
        try {
            const blob = await SampleService.downloadCoa(sampleId);
            const url = window.URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error('Failed to load COA preview', error);
            message.error('Failed to load COA preview');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `COA_${sampleNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    return (
        <Modal
            title={<Space><EyeOutlined /> COA Preview: {sampleNumber}</Space>}
            open={visible}
            onCancel={onClose}
            width={1000}
            style={{ top: 20 }}
            styles={{ body: { height: 'calc(100vh - 200px)', padding: 0 } }}
            footer={[
                <Button key="close" onClick={onClose}>
                    Close
                </Button>,
                <Button
                    key="download"
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                    disabled={!pdfUrl || loading}
                >
                    Download
                </Button>
            ]}
        >
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Spin tip="Loading PDF..." size="large" />
                </div>
            ) : pdfUrl ? (
                <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                    title="COA Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <span>Preview not available</span>
                </div>
            )}
        </Modal>
    );
};
