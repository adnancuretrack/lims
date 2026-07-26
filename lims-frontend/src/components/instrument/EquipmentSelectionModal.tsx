import React from 'react';
import { Modal, Table, Badge, Button, Input, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { InstrumentService } from '../../api/InstrumentService';
import type { InstrumentDTO } from '../../api/types';

interface EquipmentSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (instrument: InstrumentDTO) => void;
}

export const EquipmentSelectionModal: React.FC<EquipmentSelectionModalProps> = ({ open, onClose, onSelect }) => {
  const { data: instruments, isLoading } = useQuery({
    queryKey: ['instruments', 'active'],
    queryFn: InstrumentService.listActive,
    enabled: open
  });

  const [searchText, setSearchText] = React.useState('');

  // Reset search text when modal opens
  React.useEffect(() => {
    if (open) {
      setSearchText('');
    }
  }, [open]);

  const filteredInstruments = React.useMemo(() => {
    if (!instruments) return [];
    if (!searchText.trim()) return instruments;
    const query = searchText.toLowerCase();
    return instruments.filter(inst => 
      inst.name.toLowerCase().includes(query) ||
      inst.serialNumber.toLowerCase().includes(query) ||
      (inst.model && inst.model.toLowerCase().includes(query))
    );
  }, [instruments, searchText]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: InstrumentDTO, b: InstrumentDTO) => a.name.localeCompare(b.name)
    },
    {
      title: 'Equipment Number (Serial)',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Calibration Status',
      key: 'calibrationStatus',
      render: (_: any, record: InstrumentDTO) => {
        if (record.calibrationOverdue) {
          return <Badge status="error" text="Overdue" />;
        }
        return <Badge status="success" text="Valid" />;
      }
    },
    {
      title: 'Calibration Due Date',
      dataIndex: 'calibrationDueDate',
      key: 'calibrationDueDate',
      render: (text: string) => text ? new Date(text).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: InstrumentDTO) => {
        const status = record.status ? record.status.toUpperCase() : '';
        const isRetired = status === 'RETIRED';
        const isMaintenance = status === 'MAINTENANCE';
        const isUnusable = isRetired || isMaintenance || record.calibrationOverdue;
        
        let disabledReason = '';
        if (isRetired) disabledReason = 'Instrument is retired';
        else if (isMaintenance) disabledReason = 'Instrument is under maintenance';
        else if (record.calibrationOverdue) disabledReason = 'Calibration is overdue';

        return (
          <Tooltip title={disabledReason}>
            <Button 
              type="primary" 
              size="small" 
              onClick={() => onSelect(record)}
              disabled={isUnusable}
            >
              Select
            </Button>
          </Tooltip>
        );
      }
    }
  ];

  return (
    <Modal
      title="Select Laboratory Equipment"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Input.Search
        placeholder="Search by name, serial number, or model..."
        allowClear
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <Table
        loading={isLoading}
        columns={columns}
        dataSource={filteredInstruments}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 8 }}
      />
    </Modal>
  );
};
