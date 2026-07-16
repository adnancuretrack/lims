import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Space, Alert, Tag, Row, Col, Card, Tooltip } from 'antd';
import { ApiOutlined, DisconnectOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAdrCapture } from '../../hooks/useAdrCapture';
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
  const { connectionState, latestFrame, connect, disconnect } = useAdrCapture();
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

  const renderValueCard = (label: string, value: number | undefined, unit: string) => (
    <Card 
      size="small" 
      className="adr-value-card"
      actions={[
        <Button 
          type="primary" 
          size="small" 
          disabled={value === undefined}
          onClick={() => value !== undefined && handleCapture(value)}
          icon={<ThunderboltOutlined />}
        >
          Capture
        </Button>
      ]}
    >
      <div className="adr-value-label">{label}</div>
      <div className={`adr-value-display ${value !== undefined ? 'active' : 'inactive'}`}>
        {value !== undefined ? value.toFixed(2) : '--'} <span className="adr-value-unit">{unit}</span>
      </div>
    </Card>
  );

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

      <div className="adr-dashboard">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            {renderValueCard('LOAD', latestFrame?.load, 'kN')}
          </Col>
          <Col span={12}>
            {renderValueCard('STRESS', latestFrame?.stress, 'MPa')}
          </Col>
          <Col span={12}>
            {renderValueCard('PACE', latestFrame?.pace, 'MPa/s')}
          </Col>
          <Col span={12}>
            {renderValueCard('TIME', latestFrame?.time, 's')}
          </Col>
        </Row>
      </div>

      {latestFrame && (
        <div className="adr-audit-footer">
          <Tooltip title={latestFrame.integrityHash}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Latest Hash: {latestFrame.integrityHash.substring(0, 16)}...
            </Text>
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            Validated {latestFrame.timestamp.toLocaleTimeString()}
          </Text>
        </div>
      )}
    </Modal>
  );
};
