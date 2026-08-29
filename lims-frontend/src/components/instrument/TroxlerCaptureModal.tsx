import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Button, Typography, Space, Alert, Tag, Tooltip, Table, Checkbox, Select } from 'antd';
import { ApiOutlined, DisconnectOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined, InfoCircleOutlined, AlertOutlined } from '@ant-design/icons';
import { useTroxlerCapture } from '../../hooks/useTroxlerCapture';
import type { TroxlerStationRecord } from '../../services/instrument/troxlerTypes';
import './TroxlerCaptureModal.css';

const { Text } = Typography;

interface TroxlerCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (value: number | string) => void;
  targetFieldId: string;
  targetFieldLabel: string;
}

interface TableRowData {
  key: string;
  label: string;
  rawValue?: string;
  unit: string;
  numericValue?: number;
}

export const TroxlerCaptureModal: React.FC<TroxlerCaptureModalProps> = ({
  open,
  onClose,
  onCapture,
  targetFieldLabel
}) => {
  const { connectionState, latestBlock, blockHistory, connect, disconnect } = useTroxlerCapture();
  const [isSupported, setIsSupported] = useState(true);
  const [powerOffConfirmed, setPowerOffConfirmed] = useState(false);
  const [selectedStaIndex, setSelectedStaIndex] = useState<number>(0);

  useEffect(() => {
    setIsSupported('serial' in navigator);
  }, []);

  // Update selected station index when a new block arrives
  useEffect(() => {
    if (latestBlock?.stations && latestBlock.stations.length > 0) {
      setSelectedStaIndex(latestBlock.stations.length - 1);
    }
  }, [latestBlock]);

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
      case 'connected': return 'Connected to Troxler 3440';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const currentStation: TroxlerStationRecord | undefined = useMemo(() => {
    if (!latestBlock?.stations || latestBlock.stations.length === 0) return undefined;
    return latestBlock.stations[selectedStaIndex] ?? latestBlock.stations[0];
  }, [latestBlock, selectedStaIndex]);

  const tableData: TableRowData[] = useMemo(() => {
    if (!currentStation) return [];

    const parseNum = (val?: string): number | undefined => {
      if (!val) return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    const unit = currentStation.units || 'PCF';

    return [
      { key: 'wd', label: 'Wet Density (WD)', rawValue: currentStation.wd, unit, numericValue: parseNum(currentStation.wd) },
      { key: 'dd', label: 'Dry Density (DD)', rawValue: currentStation.dd, unit, numericValue: parseNum(currentStation.dd) },
      { key: 'pr', label: 'Proctor Ratio (PR)', rawValue: currentStation.pr, unit: 'PCF', numericValue: parseNum(currentStation.pr) },
      { key: 'pctPr', label: '% Proctor Ratio (%PR)', rawValue: currentStation.pctPr, unit: '%', numericValue: parseNum(currentStation.pctPr) },
      { key: 'm', label: 'Moisture (M)', rawValue: currentStation.m, unit, numericValue: parseNum(currentStation.m) },
      { key: 'pctM', label: '% Moisture (%M)', rawValue: currentStation.pctM, unit: '%', numericValue: parseNum(currentStation.pctM) },
      { key: 'densCnt', label: 'Density Count', rawValue: currentStation.densCnt?.toString(), unit: 'cnt', numericValue: currentStation.densCnt },
      { key: 'moistCnt', label: 'Moisture Count', rawValue: currentStation.moistCnt?.toString(), unit: 'cnt', numericValue: currentStation.moistCnt },
      { key: 'stdD', label: 'Standard Count D', rawValue: currentStation.stdD?.toString(), unit: 'cnt', numericValue: currentStation.stdD },
      { key: 'stdM', label: 'Standard Count M', rawValue: currentStation.stdM?.toString(), unit: 'cnt', numericValue: currentStation.stdM },
    ];
  }, [currentStation]);

  const columns = [
    {
      title: 'Field',
      dataIndex: 'label',
      key: 'label',
      width: '40%',
    },
    {
      title: 'Value',
      dataIndex: 'rawValue',
      key: 'rawValue',
      width: '25%',
      render: (val?: string) => val ?? '—',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: '15%',
      render: (unit: string) => unit || '—',
    },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_: any, record: TableRowData) => (
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
          <span>Instrument Capture: Troxler Model 3440</span>
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
      width={720}
      className="troxler-capture-modal"
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

      <Alert
        message="Hot-Plugging Hardware Hazard"
        description="Connecting or disconnecting the RS-232 cable while the Troxler gauge is powered ON can cause permanent electrical damage to the mainboard."
        type="warning"
        showIcon
        icon={<AlertOutlined />}
        style={{ marginBottom: 16 }}
      />

      {connectionState.errorMessage && (
        <Alert
          message="Notice"
          description={connectionState.errorMessage}
          type={connectionState.errorMessage.startsWith('Warning:') ? 'warning' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="troxler-connection-bar">
        <Space direction="vertical" style={{ width: '100%' }}>
          {connectionState.status !== 'connected' ? (
            <Space>
              <Checkbox
                checked={powerOffConfirmed}
                onChange={e => setPowerOffConfirmed(e.target.checked)}
              >
                I confirm the Troxler 3440 is powered OFF
              </Checkbox>
              <Button
                type="primary"
                onClick={connect}
                disabled={!isSupported || connectionState.status === 'connecting' || !powerOffConfirmed}
                icon={<ApiOutlined />}
              >
                Connect to Gauge
              </Button>
            </Space>
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

      <div className="troxler-target-info">
        <Text strong>Target Field:</Text> <Tag color="blue">{targetFieldLabel}</Tag>
        <Text type="secondary" style={{ marginLeft: 8 }}>Select a value below to insert it into this field.</Text>
      </div>

      {latestBlock && (
        <div className="troxler-project-header">
          <Space size="large">
            <div><Text type="secondary">Project:</Text> <Text strong>{latestBlock.projectId}</Text></div>
            <div><Text type="secondary">Serial No:</Text> <Text strong>{latestBlock.serialNum}</Text></div>
            <div><Text type="secondary">Date:</Text> <Text strong>{latestBlock.date}</Text></div>
          </Space>
          {latestBlock.stations.length > 1 && (
            <Space>
              <Text type="secondary">Station:</Text>
              <Select
                value={selectedStaIndex}
                onChange={v => setSelectedStaIndex(v)}
                style={{ width: 140 }}
                size="small"
              >
                {latestBlock.stations.map((st, idx) => (
                  <Select.Option key={idx} value={idx}>
                    STA #{st.staNum} ({st.time})
                  </Select.Option>
                ))}
              </Select>
            </Space>
          )}
        </div>
      )}

      <div className="troxler-report-table">
        {connectionState.status === 'connected' && !latestBlock && (
          <div className="troxler-waiting-state">
            <SyncOutlined spin style={{ fontSize: 24, marginBottom: 12 }} />
            <div>Waiting for data... On the Troxler gauge, press <strong>[SHIFT] → [PRINT] → [1- one Project] → [START/ENTER]</strong> to send data.</div>
          </div>
        )}

        {latestBlock && currentStation && (
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="key"
            pagination={false}
            size="small"
            rowClassName={(record) =>
              targetFieldLabel && record.label.toLowerCase().includes(targetFieldLabel.toLowerCase())
                ? 'troxler-row-highlight'
                : ''
            }
          />
        )}
      </div>

      {latestBlock && (
        <div className="troxler-audit-footer">
          <Tooltip title={latestBlock.sha256}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              SHA-256: {latestBlock.sha256.substring(0, 16)}...
            </Text>
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            Validated {new Date(latestBlock.capturedAt).toLocaleTimeString()}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
            Project Block {blockHistory.length}
          </Text>
        </div>
      )}
    </Modal>
  );
};
