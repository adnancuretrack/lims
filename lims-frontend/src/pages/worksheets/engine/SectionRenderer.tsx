import React from 'react';
import { Form, Input, Table, Checkbox, Radio, InputNumber, Typography, Button, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { SectionSchema, FieldSchema } from '../../methods/designer/types';
import { useEngineStore } from './store';
import { evaluateCondition } from './FormulaEngine';
import { ChartRenderer } from './ChartRenderer';
import { getGroupedColumns } from '../../methods/designer/utils';

const { Text } = Typography;

interface SectionRendererProps {
  section: SectionSchema;
  readOnly?: boolean;
  externalData?: Record<string, any>;
  externalSchema?: any;
  externalErrors?: Record<string, { message: string; severity: 'WARNING' | 'ERROR' }>;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, readOnly, externalData, externalSchema, externalErrors }) => {
  const storeState = useEngineStore();
  
  // Use external props if in read-only mode, otherwise use global store
  const data = readOnly ? (externalData || {}) : storeState.data;
  const errors = readOnly ? (externalErrors || {}) : storeState.errors;
  const schema = readOnly ? (externalSchema || storeState.schema) : storeState.schema;
  
  const { updateFieldValue, updateRowValue, updateMatrixValue, addRow, removeRow } = storeState;

  const renderFieldInput = (field: FieldSchema, value: any, onChange: (v: any) => void) => {
    switch (field.inputType) {
      case 'TEXTAREA':
        return <Input.TextArea rows={2} value={value} onChange={e => onChange(e.target.value)} disabled={readOnly || field.required === false} />;
      case 'CHECKBOX':
      case 'YES_NO':
        return <Checkbox checked={value} onChange={e => onChange(e.target.checked)} disabled={readOnly}>{field.label}</Checkbox>;
      case 'SELECTION_INLINE':
      case 'RADIO':
        return <Radio.Group value={value} onChange={e => onChange(e.target.value)} options={field.options?.map(o => ({ label: o, value: o })) || []} disabled={readOnly} />;
      case 'NUMERIC':
        return <InputNumber value={value} onChange={onChange} style={{ width: '100%' }} disabled={readOnly} />;
      case 'CALCULATED':
        return <Input disabled value={value} placeholder="Auto-calculated" style={{ backgroundColor: '#f5f5f5' }} />;
      default:
        return <Input value={value} onChange={e => onChange(e.target.value)} disabled={readOnly || field.inputType === 'READONLY'} />;
    }
  };

  if (section.type === 'SINGLE_VALUE') {
    const sectionData = data[section.id] || {};
    return (
      <Form layout={section.layout === 'TWO_COLUMN' ? 'horizontal' : 'vertical'}>
        <div style={{ display: 'grid', gridTemplateColumns: section.layout === 'TWO_COLUMN' ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {section.fields?.map(f => {
            if (f.visibilityCondition) {
              const isVisible = evaluateCondition({
                formula: f.visibilityCondition,
                schema: schema!,
                data,
                currentSectionId: section.id,
                currentRowIndex: null
              });
              if (!isVisible) return null;
            }

            const error = errors[`${section.id}.${f.id}`];
            return (
              <Form.Item 
                key={f.id} 
                label={f.label} 
                required={f.required}
                validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
                help={error?.message}
              >
                {renderFieldInput(f, sectionData[f.id], (v) => updateFieldValue(section.id, f.id, v))}
              </Form.Item>
            );
          })}
        </div>
      </Form>
    );
  }

  if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
    const tableData = data[section.id] || [];

    if (section.orientation === 'COLUMNS_AS_TRIALS') {
      const trialLen = tableData.length;
      const minRows = section.minRows || 1;
      const maxRows = section.maxRows || Infinity;
      const trials = Array.from({ length: trialLen }, (_, i) => `Trial ${i + 1}`);

      const columns = [
        { title: 'Field', dataIndex: 'label', key: 'label', fixed: 'left' as const, width: 200 },
        ...trials.map((t, i) => ({
          title: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>{t}</span>
               {trialLen > minRows && !readOnly && (
                 <Button 
                    type="text" 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined style={{ fontSize: 12 }} />} 
                    onClick={(e) => {
                       e.stopPropagation();
                       removeRow(section.id, i);
                    }}
                 />
               )}
            </div>
          ),
          dataIndex: `trial_${i}`,
          key: `trial_${i}`,
          render: (_: any, record: any) => {
             const val = tableData[i]?.[record.key];
             const error = errors[`${section.id}.${i}.${record.key}`];
             return (
               <Form.Item 
                 validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
                 help={error?.message}
                 style={{ margin: 0 }}
               >
                 {renderFieldInput(record.fieldSchema, val, (v) => updateRowValue(section.id, i, record.key, v))}
               </Form.Item>
             );
          }
        })),
        ...(trialLen < maxRows && !readOnly ? [{
          title: (
            <Button 
              type="dashed" 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={() => addRow(section.id)}
              style={{ width: '100%', fontSize: 11 }}
            >
              Add Column
            </Button>
          ),
          key: 'add_col',
          width: 120,
        }] : [])
      ];
      
      const dataSource = (section.columns || section.dataColumns || []).map(f => ({
        key: f.id,
        label: (f.label || f.id) + (f.unit ? ` (${f.unit})` : ''),
        fieldSchema: f,
      }));

      return <Table columns={columns} dataSource={dataSource} pagination={false} size="small" scroll={{ x: 'max-content' }} bordered />;
    } else {
      // ROWS_AS_RECORDS
      const buildCol = (c: FieldSchema) => ({
        title: c.label + (c.unit ? ` (${c.unit})` : ''),
        dataIndex: c.id,
        key: c.id,
        render: (_: any, __: any, index: number) => {
          const val = tableData[index]?.[c.id];
          const error = errors[`${section.id}.${index}.${c.id}`];
          return (
            <Form.Item 
              validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
              help={error?.message}
              style={{ margin: 0 }}
            >
              {renderFieldInput(c, val, (v) => updateRowValue(section.id, index, c.id, v))}
            </Form.Item>
          );
        }
      });

      const columns = getGroupedColumns({ 
        fields: section.columns || section.dataColumns || [], 
        groups: section.columnGroups,
        buildCol
      });

      const minRows = section.minRows || 1;
      const maxRows = section.maxRows || Infinity;
      const canDelete = tableData.length > minRows;

      if ((canDelete || tableData.length > 0) && !readOnly) {
        columns.push({
          title: '',
          dataIndex: 'actions',
          key: 'actions',
          width: 50,
          fixed: 'right',
          render: (_: any, __: any, index: number) => (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              disabled={tableData.length <= minRows}
              onClick={() => removeRow(section.id, index)} 
            />
          )
        });
      }

      const getLeafColumns = (cols: any[]): any[] => {
        let leaf: any[] = [];
        cols.forEach(c => {
          if (c.children) leaf = leaf.concat(getLeafColumns(c.children));
          else leaf.push(c);
        });
        return leaf;
      };
      
      const leafColumns = getLeafColumns(columns);

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Table 
            columns={columns} 
            dataSource={tableData} 
            rowKey={(_, i) => i || 0} 
            pagination={false} 
            size="small" 
            scroll={{ x: 'max-content' }} 
            bordered 
            summary={(pageData) => {
              if (!section.showTotalRow || !section.totalColumns?.length) return null;
              
              return (
                <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                  {leafColumns.map((col, idx) => {
                    if (idx === 0) {
                      return (
                        <Table.Summary.Cell index={idx} key="total-label">
                          <Text strong>{section.totalRowLabel || 'Total'}</Text>
                        </Table.Summary.Cell>
                      );
                    }

                    if (section.totalColumns?.includes(col.key)) {
                      const sum = pageData.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
                      const fieldSchema = (section.columns || section.dataColumns || []).find(f => f.id === col.key);
                      const formattedSum = fieldSchema?.precision !== undefined ? sum.toFixed(fieldSchema.precision) : sum;
                      return (
                        <Table.Summary.Cell index={idx} key={col.key}>
                          <Text strong>{formattedSum}</Text>
                        </Table.Summary.Cell>
                      );
                    }

                    return <Table.Summary.Cell index={idx} key={col.key} />;
                  })}
                </Table.Summary.Row>
              );
            }}
          />
          {tableData.length < maxRows && !readOnly && (
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={() => addRow(section.id)} 
              style={{ width: '100%' }}
            >
              Add Row
            </Button>
          )}
        </Space>
      );
    }
  }

  if (section.type === 'CHART') {
    return <ChartRenderer section={section} />;
  }

  if (section.type === 'MATRIX_TABLE') {
    const matrixData = data[section.id] || {};

    const rowStubCol = {
      title: '',
      dataIndex: 'rowLabel',
      key: 'rowLabel',
      width: 160,
      fixed: 'left' as const,
      render: (text: string) => <Text strong>{text}</Text>
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
      render: (_: any, record: any) => {
        const val = matrixData[record.rowId]?.[c.id];
        const error = errors[`${section.id}.${record.rowId}.${c.id}`];
        return (
          <Form.Item 
            validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
            help={error?.message}
            style={{ margin: 0 }}
          >
            {renderFieldInput(c, val, (v) => updateMatrixValue(section.id, record.rowId, c.id, v))}
          </Form.Item>
        );
      }
    });

    const dataCols = getGroupedColumns({ 
      fields: section.columns || [], 
      groups: section.columnGroups,
      buildCol 
    });

    const dataSource = (section.rowHeaders || []).map(rh => ({
      key: rh.id,
      rowId: rh.id,
      rowLabel: rh.label
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

  return <Text type="secondary">Unsupported section type: {section.type}</Text>;
};
