import React from 'react';
import { Form, Input, Table, Checkbox, Radio, InputNumber, Typography, Button, Space, message, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined, ApiOutlined, SearchOutlined } from '@ant-design/icons';
import type { SectionSchema, FieldSchema } from '../../methods/designer/types';
import { useEngineStore } from './store';
import { evaluateCondition } from './FormulaEngine';
import { ChartRenderer } from './ChartRenderer';
import { getGroupedColumns } from '../../methods/designer/utils';
import { AdrCaptureModal } from '../../../components/instrument/AdrCaptureModal';
import { NlCaptureModal } from '../../../components/instrument/NlCaptureModal';
import { EquipmentSelectionModal } from '../../../components/instrument/EquipmentSelectionModal';
import { formatDateTime } from '../../../utils/dateUtils';

const { Text } = Typography;

interface SectionRendererProps {
  section: SectionSchema;
  readOnly?: boolean;
  externalData?: Record<string, any>;
  externalSchema?: any;
  externalErrors?: Record<string, { message: string; severity: 'WARNING' | 'ERROR' }>;
  externalSpecimens?: any[];
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section, readOnly, externalData, externalSchema, externalErrors, externalSpecimens }) => {
  const storeState = useEngineStore();

  // Use external props if in read-only mode, otherwise use global store
  const data = readOnly ? (externalData || {}) : storeState.data;
  const errors = readOnly ? (externalErrors || {}) : storeState.errors;
  const schema = readOnly ? (externalSchema || storeState.schema) : storeState.schema;
  const specimenStatuses = readOnly ? (externalSpecimens || []) : (storeState.specimenStatuses || []);

  const { updateFieldValue, updateRowValue, updateMatrixValue, addRow, removeRow } = storeState;

  const [captureModalOpen, setCaptureModalOpen] = React.useState(false);
  const [captureTarget, setCaptureTarget] = React.useState<{ fieldId: string, label: string, rowIndex?: number, rowId?: string, instrumentSource?: string } | null>(null);

  const [equipmentModalOpen, setEquipmentModalOpen] = React.useState(false);
  const [equipmentTarget, setEquipmentTarget] = React.useState<{ rowId: string } | null>(null);

  const handleSelectEquipment = (inst: any) => {
    if (!equipmentTarget) return;
    updateMatrixValue(section.id, equipmentTarget.rowId, 'equipmentNumber', inst.serialNumber);

    if (inst.calibrationOverdue) {
      message.warning(`Warning: ${inst.name} (${inst.serialNumber}) is overdue for calibration.`);
    }

    const calDate = inst.calibrationDueDate ? new Date(inst.calibrationDueDate).toLocaleDateString() : 'N/A';
    updateMatrixValue(section.id, equipmentTarget.rowId, 'calibrationDate', calDate);

    setEquipmentModalOpen(false);
    setEquipmentTarget(null);
  };

  const handleCapture = (value: number | string) => {
    if (!captureTarget) return;
    const { fieldId, rowIndex, rowId } = captureTarget;

    if (rowIndex !== undefined) {
      updateRowValue(section.id, rowIndex, fieldId, value);
    } else if (rowId !== undefined) {
      updateMatrixValue(section.id, rowId, fieldId, value);
    } else {
      updateFieldValue(section.id, fieldId, value);
    }
  };

  const renderCaptureModal = () => {
    if (!captureTarget) return null;
    if (captureTarget.instrumentSource === 'ADR_TOUCH') {
      return (
        <AdrCaptureModal
          open={captureModalOpen}
          onClose={() => setCaptureModalOpen(false)}
          onCapture={handleCapture}
          targetFieldId={captureTarget.fieldId}
          targetFieldLabel={captureTarget.label}
        />
      );
    }
    if (captureTarget.instrumentSource === 'NL_5032X') {
      return (
        <NlCaptureModal
          open={captureModalOpen}
          onClose={() => setCaptureModalOpen(false)}
          onCapture={handleCapture}
          targetFieldId={captureTarget.fieldId}
          targetFieldLabel={captureTarget.label}
        />
      );
    }
    return null;
  };

  const renderFieldInput = (field: FieldSchema, value: any, onChange: (v: any) => void, rowIndex?: number, rowId?: string) => {
    const isInstrumentLinked = !!field.instrumentSource;
    let isColumnFinalized = false;
    if (section.hasMultiDaySpecimen && rowIndex !== undefined) {
      const spec = specimenStatuses?.find((s: any) => s.specimenNumber === rowIndex + 1);
      if (spec && (spec.status === 'FINALIZED' || spec.status === 'AUTHORIZED')) {
        isColumnFinalized = true;
      }
    }
    const isFieldDisabled = readOnly || isInstrumentLinked || isColumnFinalized;
    const formattedValue = (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value))
      ? formatDateTime(value)
      : value;

    let inputEl;
    switch (field.inputType) {
      case 'TEXTAREA':
        inputEl = <Input.TextArea rows={2} value={formattedValue} onChange={e => onChange(e.target.value)} disabled={isFieldDisabled || field.required === false} />; break;
      case 'CHECKBOX':
      case 'YES_NO':
        inputEl = <Checkbox checked={value} onChange={e => onChange(e.target.checked)} disabled={isFieldDisabled}>{field.label}</Checkbox>; break;
      case 'SELECTION_INLINE':
      case 'RADIO':
        inputEl = <Radio.Group value={value} onChange={e => onChange(e.target.value)} options={field.options?.map(o => ({ label: o, value: o })) || []} disabled={isFieldDisabled} />; break;
      case 'NUMERIC':
        inputEl = <InputNumber value={value} onChange={onChange} style={{ width: '100%' }} disabled={isFieldDisabled} />; break;
      case 'CALCULATED':
        inputEl = <Input disabled value={formattedValue} placeholder="Auto-calculated" style={{ backgroundColor: '#f5f5f5' }} />; break;
      default:
        inputEl = <Input value={formattedValue} onChange={e => onChange(e.target.value)} disabled={isFieldDisabled || field.inputType === 'READONLY'} />; break;
    }

    if (field.instrumentSource && field.instrumentSource !== 'GENERIC_SERIAL' && !readOnly) {
      return (
        <Space.Compact style={{ width: '100%' }}>
          {inputEl}
          <Button
            icon={<ApiOutlined />}
            onClick={() => {
              setCaptureTarget({ fieldId: field.id, label: field.label, rowIndex, rowId, instrumentSource: field.instrumentSource });
              setCaptureModalOpen(true);
            }}
            title="Capture from Instrument"
          />
        </Space.Compact>
      );
    }

    return inputEl;
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
        {renderCaptureModal()}
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
        ...trials.map((t, i) => {
          let specTitle = t;
          let specBadge = null;
          let isFinalizedOrAuth = false;
          if (section.hasMultiDaySpecimen) {
            const spec = specimenStatuses?.find((s: any) => s.specimenNumber === i + 1);
            if (spec) {
              specTitle = spec.label ? `${spec.label} (#${i + 1})` : `Specimen ${i + 1}`;
              const dateStr = spec.scheduledTestDate ? ` (${spec.scheduledTestDate})` : '';
              specTitle += dateStr;
              isFinalizedOrAuth = spec.status === 'FINALIZED' || spec.status === 'AUTHORIZED';

              if (spec.status === 'FINALIZED') {
                specBadge = <Tag color="orange" style={{ margin: 0 }}>FINALIZED</Tag>;
              } else if (spec.status === 'AUTHORIZED') {
                specBadge = <Tag color="green" style={{ margin: 0 }}>AUTHORIZED</Tag>;
              }
            } else {
              specTitle = `Specimen ${i + 1}`;
            }
          }
          return {
            title: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{specTitle}</span>
                  {!isFinalizedOrAuth && trialLen > minRows && !readOnly && (
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
                {specBadge}
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
                  {renderFieldInput(record.fieldSchema, val, (v) => updateRowValue(section.id, i, record.key, v), i)}
                </Form.Item>
              );
            }
          };
        }),
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

      return (
        <>
          <Table columns={columns} dataSource={dataSource} pagination={false} size="small" scroll={{ x: 'max-content' }} bordered />
          {renderCaptureModal()}
        </>
      );
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
              {renderFieldInput(c, val, (v) => updateRowValue(section.id, index, c.id, v), index)}
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
          {renderCaptureModal()}
        </Space>
      );
    }
  }

  if (section.type === 'CHART') {
    return <ChartRenderer section={section} />;
  }

  if (section.type === 'EQUIPMENT') {
    const matrixData = data[section.id] || {};

    const columns = [
      {
        title: 'Equipment Name',
        dataIndex: 'rowLabel',
        key: 'rowLabel',
        width: 200,
        render: (text: string) => <Text strong>{text}</Text>
      },
      {
        title: 'Equipment Number',
        key: 'equipmentNumber',
        width: 250,
        render: (_: any, record: any) => {
          const val = matrixData[record.rowId]?.['equipmentNumber'] || '';
          const error = errors[`${section.id}.${record.rowId}.equipmentNumber`];
          return (
            <Form.Item
              validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
              help={error?.message}
              style={{ margin: 0 }}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input value={val} placeholder="Select equipment..." disabled style={{ color: '#000' }} />
                {!readOnly && (
                  <Button
                    icon={<SearchOutlined />}
                    onClick={() => {
                      setEquipmentTarget({ rowId: record.rowId });
                      setEquipmentModalOpen(true);
                    }}
                    title="Select Equipment"
                  />
                )}
              </Space.Compact>
            </Form.Item>
          );
        }
      },
      {
        title: 'Calibration Date',
        key: 'calibrationDate',
        width: 200,
        render: (_: any, record: any) => {
          const val = matrixData[record.rowId]?.['calibrationDate'] || '';
          const error = errors[`${section.id}.${record.rowId}.calibrationDate`];
          return (
            <Form.Item
              validateStatus={error ? (error.severity === 'ERROR' ? 'error' : 'warning') : ''}
              help={error?.message}
              style={{ margin: 0 }}
            >
              <Input value={val} placeholder="Calibration Date" disabled style={{ color: '#000' }} />
            </Form.Item>
          );
        }
      }
    ];

    const dataSource = (section.rowHeaders || []).map(rh => ({
      key: rh.id,
      rowId: rh.id,
      rowLabel: rh.label
    }));

    return (
      <>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
        />
        <EquipmentSelectionModal
          open={equipmentModalOpen}
          onClose={() => {
            setEquipmentModalOpen(false);
            setEquipmentTarget(null);
          }}
          onSelect={handleSelectEquipment}
        />
      </>
    );
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
            {renderFieldInput(c, val, (v) => updateMatrixValue(section.id, record.rowId, c.id, v), undefined, record.rowId)}
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
      <>
        <Table
          columns={[rowStubCol, ...dataCols]}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
        />
        {renderCaptureModal()}
      </>
    );
  }

  if (section.type === 'NOTES') {
    return (
      <div style={{ padding: 16, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
        <Text style={{ whiteSpace: 'pre-wrap' }}>
          {section.description || 'No notes provided.'}
        </Text>
      </div>
    );
  }

  return (
    <>
      <Text type="secondary">Unsupported section type: {section.type}</Text>
      {renderCaptureModal()}
    </>
  );
};
