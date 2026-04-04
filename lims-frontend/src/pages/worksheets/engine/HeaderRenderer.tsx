import React from 'react';
import { Form, Input, Checkbox, Radio, InputNumber, Card } from 'antd';
import type { FieldSchema } from '../../methods/designer/types';
import { useEngineStore } from './store';
import { evaluateCondition } from './FormulaEngine';

export const HeaderRenderer: React.FC = () => {
  const { schema, data, errors, updateFieldValue } = useEngineStore();

  if (!schema || !schema.headerFields || schema.headerFields.length === 0) {
    return null;
  }

  const renderFieldInput = (field: FieldSchema, value: any, onChange: (v: any) => void) => {
    switch (field.inputType) {
      case 'TEXTAREA':
        return <Input.TextArea rows={2} value={value} onChange={e => onChange(e.target.value)} />;
      case 'CHECKBOX':
      case 'YES_NO':
        return <Checkbox checked={value} onChange={e => onChange(e.target.checked)}>{field.label}</Checkbox>;
      case 'SELECTION_INLINE':
      case 'RADIO':
        return <Radio.Group value={value} onChange={e => onChange(e.target.value)} options={field.options?.map(o => ({ label: o, value: o })) || []} />;
      case 'NUMERIC':
        return <InputNumber value={value} onChange={onChange} style={{ width: '100%' }} />;
      default:
        return <Input value={value} onChange={e => onChange(e.target.value)} disabled={field.inputType === 'READONLY'} />;
    }
  };

  return (
    <Card 
      size="small" 
      title={<span style={{ color: '#1677ff', fontSize: 14 }}>Sample Information (Header Tags)</span>}
      style={{ marginBottom: 24, border: '1px solid #91caff', background: '#f0f7ff' }}
      styles={{ body: { padding: '16px' } }}
    >
      <Form layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {schema.headerFields.map(f => {
            if (f.visibilityCondition) {
              const isVisible = evaluateCondition({
                formula: f.visibilityCondition,
                schema,
                data,
                currentSectionId: 'header',
                currentRowIndex: null
              });
              if (!isVisible) return null;
            }

            const error = errors[`header.${f.id}`];
            // Header fields are stored at the top level of the data map or in a special 'header' key?
            // In our store, we usually use flat keys or section.id.field.id.
            // Let's use 'header' as a virtual section ID for metadata.
            return (
              <Form.Item 
                key={f.id} 
                label={<span style={{ fontWeight: 500, fontSize: 13 }}>{f.label}</span>} 
                required={f.required}
                validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
                help={error?.message}
                style={{ marginBottom: 0 }}
              >
                {renderFieldInput(f, data['header']?.[f.id], (v) => {
                  updateFieldValue('header', f.id, v);
                })}
              </Form.Item>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};
