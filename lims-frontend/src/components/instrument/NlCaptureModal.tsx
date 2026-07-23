import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Space, Alert, Tag, Tooltip, Table } from 'antd';
import { ApiOutlined, DisconnectOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNlCapture } from '../../hooks/useNlCapture';
import './NlCaptureModal.css';

const { Text } = Typography;

interface NlCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (value: number | string) => void;
  targetFieldId: string;
  targetFieldLabel: string;
}

export const NlCaptureModal: React.FC<NlCaptureModalProps> = ({
  open,
  onClose,
  onCapture,
  targetFieldLabel
}) => {
  const { connectionState, latestReport, reportHistory, connect, disconnect } = useNlCapture();
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported('serial' in navigator);
  }, []);

  const handleCapture = (value: number | string) => {
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
      case 'connected': return 'Connected to NL 5032X/001';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  // Map the strongly typed NlMeasurementRecord to table rows
  const getTableData = () => {
    if (!latestReport) return [];
    const r = latestReport.record;
    
    const rows = [
      { key: 'job', label: 'Job Record', value: r.job, unit: '—', numericValue: undefined, rawValue: r.job },
      { key: 'wetDensity', label: 'Wet Density', value: r.wetDensity, unit: 'kg/m³', numericValue: r.wetDensity, rawValue: r.wetDensity },
      { key: 'dryDensity', label: 'Dry Density', value: r.dryDensity, unit: 'kg/m³', numericValue: r.dryDensity, rawValue: r.dryDensity },
      { key: 'moisture', label: 'Moisture Content', value: r.moisture, unit: '%', numericValue: r.moisture, rawValue: r.moisture },
      { key: 'compaction', label: 'Compaction', value: r.compaction, unit: '%', numericValue: r.compaction, rawValue: r.compaction },
      { key: 'temperature', label: 'Temperature', value: r.temperature, unit: '°C', numericValue: r.temperature, rawValue: r.temperature },
    ];

    if (r.latitude !== undefined && r.longitude !== undefined) {
        rows.push({ key: 'latitude', label: 'Latitude', value: r.latitude, unit: '°', numericValue: r.latitude, rawValue: r.latitude });
        rows.push({ key: 'longitude', label: 'Longitude', value: r.longitude, unit: '°', numericValue: r.longitude, rawValue: r.longitude });
    }

    return rows;
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
    },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleCapture(record.rawValue)}
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
          <span>Instrument Capture: NL 5032X/001 EDG</span>
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
      className="nl-capture-modal"
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

      {latestReport?.sensorFault && (
        <Alert
          message="Sensor Fault Detected"
          description={latestReport.sensorFault}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="nl-connection-bar">
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

      <div className="nl-target-info">
        <Text strong>Target Field:</Text> <Tag color="blue">{targetFieldLabel}</Tag>
        <Text type="secondary" style={{ marginLeft: 8 }}>Select a value below to insert it into this field.</Text>
      </div>

      <div className="nl-report-table">
        {connectionState.status === 'connected' && !latestReport && (
            <div className="nl-waiting-state">
                <SyncOutlined spin style={{ fontSize: 24, marginBottom: 12 }} />
                <div>Waiting for data... Complete a test on the NL 5032X/001 to push results.</div>
            </div>
        )}
        
        {latestReport && (
            <Table 
                columns={columns} 
                dataSource={getTableData()} 
                rowKey="key"
                pagination={false}
                size="small"
                rowClassName={(record) => 
                    targetFieldLabel && record.label.toLowerCase().includes(targetFieldLabel.toLowerCase()) 
                        ? 'nl-row-highlight' 
                        : ''
                }
            />
        )}
      </div>

      {latestReport && (
        <div className="nl-audit-footer">
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
