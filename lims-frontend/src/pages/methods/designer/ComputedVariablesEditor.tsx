import React from 'react';
import { Table, Button, Input, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { ComputedVariable } from './types';

const { Text } = Typography;

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

export const ComputedVariablesEditor: React.FC = () => {
  const { schema, setSchema } = useDesignerStore();
  const computedVariables = schema.computedVariables || [];

  const handleAdd = () => {
    const newVar: ComputedVariable = {
      id: generateId('var'),
      label: 'New Variable',
      expression: ''
    };
    setSchema({
      ...schema,
      computedVariables: [...computedVariables, newVar]
    });
  };

  const handleRemove = (id: string) => {
    setSchema({
      ...schema,
      computedVariables: computedVariables.filter(v => v.id !== id)
    });
  };

  const handleChange = (id: string, field: keyof ComputedVariable, value: string) => {
    setSchema({
      ...schema,
      computedVariables: computedVariables.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      )
    });
  };

  const columns = [
    {
      title: 'Variable ID',
      dataIndex: 'id',
      key: 'id',
      width: '15%',
      render: (text: string, record: ComputedVariable) => (
        <Input 
          value={text} 
          onChange={e => handleChange(record.id, 'id', e.target.value)}
          placeholder="e.g. avgMoisture"
        />
      )
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      width: '20%',
      render: (text: string, record: ComputedVariable) => (
        <Input 
          value={text} 
          onChange={e => handleChange(record.id, 'label', e.target.value)}
          placeholder="e.g. Average Moisture"
        />
      )
    },
    {
      title: 'Expression',
      dataIndex: 'expression',
      key: 'expression',
      width: '40%',
      render: (text: string, record: ComputedVariable) => (
        <Input.TextArea 
          value={text} 
          onChange={e => handleChange(record.id, 'expression', e.target.value)}
          placeholder="e.g. AVG(results.*.moisture)"
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
      )
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      width: '15%',
      render: (text: string, record: ComputedVariable) => (
        <Input 
          value={text} 
          onChange={e => handleChange(record.id, 'format', e.target.value)}
          placeholder="e.g. %.2f"
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: '10%',
      render: (_: any, record: ComputedVariable) => (
        <Popconfirm title="Delete this variable?" onConfirm={() => handleRemove(record.id)}>
          <Button danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>
      )
    }
  ];

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Computed Variables</h2>
          <Text type="secondary">
            Define formulas and calculations that can be injected into the report template.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Variable
        </Button>
      </div>
      
      <Table 
        dataSource={computedVariables} 
        columns={columns} 
        rowKey="id"
        pagination={false}
        bordered
      />

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}>
        <h4>Expression Guide</h4>
        <ul>
          <li><b>Mathematical operations:</b> <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>( )</code></li>
          <li><b>Aggregations:</b> <code>AVG(section.*.field)</code>, <code>SUM(section.*.field)</code>, <code>MAX(...)</code>, <code>MIN(...)</code>, <code>COUNT(...)</code></li>
          <li><b>Conditionals:</b> <code>IF(condition, trueValue, falseValue)</code></li>
          <li><b>References:</b> Refer to fields directly e.g. <code>results.moisture.0</code> or header fields <code>header.sampleId</code></li>
        </ul>
      </div>
    </div>
  );
};
