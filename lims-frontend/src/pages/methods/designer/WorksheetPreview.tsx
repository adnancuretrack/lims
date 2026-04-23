import React from 'react';
import { Modal, Form, Input, Table, Checkbox, Radio, Typography, Card, Space, Empty, Tag } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import type { WorksheetSchema, SectionSchema, FieldSchema } from './types';
import { getGroupedColumns } from './utils';

const { Title, Text } = Typography;

interface WorksheetPreviewProps {
  schema: WorksheetSchema;
  isOpen: boolean;
  onClose: () => void;
}

const renderFieldInput = (field: FieldSchema) => {
  switch (field.inputType) {
    case 'TEXTAREA':
      return <Input.TextArea placeholder={field.label} rows={2} disabled />;
    case 'CHECKBOX':
    case 'YES_NO':
      return <Checkbox disabled>{field.label}</Checkbox>;
    case 'SELECTION_INLINE':
    case 'RADIO':
      return <Radio.Group disabled options={field.options?.map(o => ({ label: o, value: o })) || []} />;
    case 'NUMERIC':
      return <Input type="number" placeholder={`0.${'0'.repeat(field.precision || 0)} ${field.unit || ''}`} disabled />;
    case 'CALCULATED':
      return <Input disabled placeholder="Auto-calculated" style={{ backgroundColor: '#f5f5f5' }} />;
    default:
      return <Input placeholder={field.label} disabled />;
  }
};

const renderSection = (section: SectionSchema) => {
  if (section.type === 'SINGLE_VALUE') {
    return (
      <Form layout={section.layout === 'TWO_COLUMN' ? 'horizontal' : 'vertical'}>
        <div style={{ display: 'grid', gridTemplateColumns: section.layout === 'TWO_COLUMN' ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {section.fields?.map(f => (
            <Form.Item key={f.id} label={f.label} required={f.required}>
              {renderFieldInput(f)}
            </Form.Item>
          ))}
        </div>
      </Form>
    );
  }

  if (section.type === 'DATA_TABLE') {
    const buildCol = (c: FieldSchema) => ({
      title: c.label + (c.unit ? ` (${c.unit})` : ''),
      dataIndex: c.id,
      key: c.id,
      render: () => renderFieldInput(c)
    });

    const baseFields = section.columns || section.dataColumns || section.fields || [];

    if (section.orientation === 'COLUMNS_AS_TRIALS') {
      const trialLen = section.minRows || 3;
      const trials = Array.from({ length: trialLen }, (_, i) => `Trial ${i + 1}`);
      const columns = [
        { title: 'Field', dataIndex: 'label', key: 'label', fixed: 'left' as const, width: 200 },
        ...trials.map((t, i) => ({
          title: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t}</span>
              <CloseOutlined style={{ fontSize: 10, color: '#ff4d4f', cursor: 'pointer' }} />
            </div>
          ),
          dataIndex: `trial_${i}`,
          key: `trial_${i}`,
          render: () => <Input disabled size="small" />
        })),
        {
          title: <PlusOutlined style={{ color: '#1677ff', cursor: 'pointer' }} />,
          key: 'add_col',
          width: 50,
        }
      ];
      
      const dataSource = baseFields.map(f => ({
        key: f.id,
        label: (f.label || f.id) + (f.unit ? ` (${f.unit})` : ''),
      }));

      return <Table columns={columns} dataSource={dataSource} pagination={false} size="small" scroll={{ x: 'max-content' }} />;
    } else {
      // ROWS_AS_RECORDS
      const columns = getGroupedColumns({ fields: baseFields, groups: section.columnGroups, buildCol });
      const dataSource = Array.from({ length: section.minRows || 3 }, (_, i) => ({ key: i }));

      return <Table columns={columns} dataSource={dataSource} pagination={false} size="small" bordered scroll={{ x: 'max-content' }} />;
    }
  }

  if (section.type === 'MATRIX_TABLE') {
    const baseFields = section.columns || section.dataColumns || section.fields || [];
    
    const rowStubCol = {
      title: '',
      dataIndex: 'rowLabel',
      key: 'rowLabel',
      width: 160,
      fixed: 'left' as const,
      render: (text: string, record: any) => (
        <Space>
          <Text strong>{text}</Text>
          {record.systemMapping && <Tag color="blue" style={{ fontSize: 9 }}>⚡ Auto</Tag>}
        </Space>
      )
    };

    const buildCol = (c: FieldSchema) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div>{c.label}</div>
          {c.unit && <Text type="secondary" style={{ fontSize: 11 }}>({c.unit})</Text>}
        </div>
      ),
      dataIndex: c.id,
      key: c.id,
      align: 'center' as const,
      render: () => renderFieldInput(c)
    });

    const dataCols = getGroupedColumns({ fields: baseFields, groups: section.columnGroups, buildCol });

    const dataSource = (section.rowHeaders || []).map(rh => ({
      key: rh.id,
      rowLabel: rh.label,
      systemMapping: rh.systemMapping
    }));

    return (
      <Table 
        columns={[rowStubCol, ...dataCols]} 
        dataSource={dataSource} 
        pagination={false} 
        size="small" 
        bordered 
        scroll={{ x: 'max-content' }}
      />
    );
  }

  return <Empty description={`Preview for ${section.type} not yet implemented`} />;
};

export const WorksheetPreview: React.FC<WorksheetPreviewProps> = ({ schema, isOpen, onClose }) => {
  return (
    <Modal
      title={<Title level={4}>Live Preview: {schema.metadata?.title || 'Untitled'}</Title>}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1000}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto', padding: '24px' }}
      style={{ top: 20 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
          <Text strong>Standard:</Text> {schema.metadata?.standard || 'N/A'} <br/>
          <Text strong>Document Ref:</Text> {schema.metadata?.documentRef || 'N/A'} ({schema.metadata?.issueDate || 'Unknown'})
        </Card>

        {schema.sections.map(section => (
          <Card 
            key={section.id} 
            title={section.title} 
            size="small"
            extra={section.visibilityCondition ? <Text type="warning" style={{fontSize: 12}}>Conditional Visibility</Text> : null}
          >
            {renderSection(section)}
          </Card>
        ))}
        
        {schema.sections.length === 0 && (
          <Empty description="No sections added yet. Drag elements from the palette." />
        )}
      </Space>
    </Modal>
  );
};
