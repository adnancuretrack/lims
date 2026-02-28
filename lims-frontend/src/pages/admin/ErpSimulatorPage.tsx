import { useState } from 'react';
import { Card, Typography, Button, Input, Space, message, Divider, Tag, List, Badge } from 'antd';
import { SendOutlined, CodeOutlined, HistoryOutlined } from '@ant-design/icons';
import { ErpService } from '../../api/ErpService';
import type { ErpJobImportRequest } from '../../api/ErpService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const MOCK_PAYLOAD: ErpJobImportRequest = {
    externalOrderId: "ORDER-123456",
    clientName: "Global BioPharma",
    productName: "Aspirin Raw Material",
    priority: "NORMAL",
    samples: [
        {
            externalSampleId: "SMP-001",
            testMethodCodes: ["M-001", "M-002"]
        },
        {
            externalSampleId: "SMP-002",
            testMethodCodes: ["M-001", "M-003"]
        }
    ]
};

export default function ErpSimulatorPage() {
    const [payload, setPayload] = useState(JSON.stringify(MOCK_PAYLOAD, null, 4));
    const [logs, setLogs] = useState<{ time: string, msg: string, type: 'success' | 'error' | 'info' }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const addLog = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
    };

    const handleImport = async () => {
        try {
            setIsLoading(true);
            const data: ErpJobImportRequest = JSON.parse(payload);
            addLog(`Sending Job Import Request for Order: ${data.externalOrderId}...`);
            const result = await ErpService.importJob(data);
            addLog(result, 'success');
            message.success('ERP Job Imported Successfully');
        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.message || err.message || 'Check JSON format';
            addLog(`Import Failed: ${errMsg}`, 'error');
            message.error('ERP Import Failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Title level={3}>ERP Integration Simulator</Title>
            <Paragraph type="secondary">
                Simulate external ERP systems (SAP, Oracle) by sending standardized Job Import requests.
            </Paragraph>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title={<span><CodeOutlined /> Payload Editor</span>} extra={<Button type="link" onClick={() => setPayload(JSON.stringify(MOCK_PAYLOAD, null, 4))}>Reset to Template</Button>}>
                    <TextArea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        rows={12}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleImport}
                            loading={isLoading}
                        >
                            Send Simulated Order to LIMS
                        </Button>
                    </div>
                </Card>

                <Card title={<span><HistoryOutlined /> Simulator Logs</span>}>
                    <List
                        dataSource={logs}
                        renderItem={item => (
                            <List.Item>
                                <Space>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>[{item.time}]</Text>
                                    <Badge status={item.type as any} />
                                    <Text type={item.type === 'error' ? 'danger' : undefined}>{item.msg}</Text>
                                </Space>
                            </List.Item>
                        )}
                        style={{ maxHeight: 300, overflow: 'auto' }}
                        locale={{ emptyText: 'No simulation logs yet.' }}
                    />
                </Card>

                <Card title="Documentation: API Contract">
                    <Text strong>Endpoint:</Text> <Tag color="blue">POST /api/erp/import-job</Tag>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong>Data Requirements:</Text>
                    <ul style={{ marginTop: 8 }}>
                        <li><Text code>clientName</Text> must exist in LIMS Master Data.</li>
                        <li><Text code>productName</Text> must exist in LIMS Master Data.</li>
                        <li><Text code>testMethodCodes</Text> must exist in LIMS Master Data.</li>
                    </ul>
                </Card>
            </Space>
        </div>
    );
}
