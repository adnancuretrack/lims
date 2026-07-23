import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Space, Alert, Tag, Tooltip, Table } from 'antd';
import { ApiOutlined, DisconnectOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAdrCapture } from '../../hooks/useAdrCapture';
import type { AdrReportField } from '../../services/instrument/adrTypes';
import './AdrCaptureModal.css';

const { Text } = Typography;

interface AdrCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (value: number | string) => void;
  targetFieldId: string;
  targetFieldLabel: string;
}

export const AdrCaptureModal: React.FC<AdrCaptureModalProps> = ({
  open,
  onClose,
  onCapture,
  targetFieldLabel
}) => {
  const { connectionState, latestReport, reportHistory, connect, disconnect } = useAdrCapture();
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported('serial' in navigator);
  }, []);

  const handleCapture = (value: number) => {
    onCapture(value);
    onClose();
  };

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected': return 'green';
      case 'connecting': return 'orange';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected': return 'Connected to ADR Touch';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const columns = [
    {
      title: 'Field',
      dataIndex: 'label',
      key: 'label',
      width: '40%',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      width: '25%',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: '15%',
      render: (unit?: string) => unit || '—',
    },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_: any, record: AdrReportField) => (
        <Button
          type="primary"
          size="small"
          disabled={record.numericValue === undefined}
          onClick={() => record.numericValue !== undefined && handleCapture(record.numericValue)}
          icon={<ThunderboltOutlined />}
        >
          Capture
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          <span>Instrument Capture: ADR Touch</span>
          <Tag color={getStatusColor()} icon={connectionState.status === 'connecting' ? <SyncOutlined spin /> : undefined}>
            {getStatusText()}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Cancel</Button>
      ]}
      width={700}
      className="adr-capture-modal"
    >
      {!isSupported && (
        <Alert
          message="Browser Not Supported"
          description="The Web Serial API is only supported in Chrome and Edge. Please switch browsers to use direct instrument capture."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {connectionState.errorMessage && (
        <Alert
          message="Connection Error"
          description={connectionState.errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="adr-connection-bar">
        <Space>
          {connectionState.status !== 'connected' ? (
            <Button 
              type="primary" 
              onClick={connect} 
              disabled={!isSupported || connectionState.status === 'connecting'}
              icon={<ApiOutlined />}
            >
              Connect to Device
            </Button>
          ) : (
            <Button 
              danger 
              onClick={disconnect}
              icon={<DisconnectOutlined />}
            >
              Disconnect
            </Button>
          )}
        </Space>
      </div>

      <div className="adr-target-info">
        <Text strong>Target Field:</Text> <Tag color="blue">{targetFieldLabel}</Tag>
        <Text type="secondary" style={{ marginLeft: 8 }}>Select a value below to insert it into this field.</Text>
      </div>

      <div className="adr-report-table">
        {connectionState.status === 'connected' && !latestReport && (
            <div className="adr-waiting-state">
                <SyncOutlined spin style={{ fontSize: 24, marginBottom: 12 }} />
                <div>Waiting for data... Press Print on the ADR Touch device to send a test report.</div>
            </div>
        )}
        
        {latestReport && (
            <Table 
                columns={columns} 
                dataSource={latestReport.fields} 
                rowKey="label"
                pagination={false}
                size="small"
                rowClassName={(record) => 
                    targetFieldLabel && record.label.toLowerCase().includes(targetFieldLabel.toLowerCase()) 
                        ? 'adr-row-highlight' 
                        : ''
                }
            />
        )}
      </div>

      {latestReport && (
        <div className="adr-audit-footer">
          <Tooltip title={latestReport.integrityHash}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Latest Hash: {latestReport.integrityHash.substring(0, 16)}...
            </Text>
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            Validated {latestReport.timestamp.toLocaleTimeString()}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
            Report {reportHistory.length}
          </Text>
        </div>
      )}
    </Modal>
  );
};
