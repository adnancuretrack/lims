import React from 'react';
import { useParams } from 'react-router-dom';
import { Form, Input, Select, InputNumber, Switch, Typography, Divider, Button, Upload, message, Space } from 'antd';
import { UploadOutlined, BookOutlined, FileExcelOutlined, CloseOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { InputType, TableOrientation, FieldSchema } from './types';
import { ColumnGroupEditor } from './ColumnGroupEditor';
import { FormulaBuilder } from './FormulaBuilder';
import { ConditionBuilder } from './ConditionBuilder';
import axios from 'axios';
import { useAuthStore } from '../../../store/authStore';

const { Title, Text: AntText } = Typography;

const INPUT_TYPES: { value: InputType, label: string }[] = [
  { value: 'TEXT', label: 'Text Field' },
  { value: 'TEXTAREA', label: 'Long Text Area' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'CALCULATED', label: 'Formula / Calculated' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'YES_NO', label: 'Yes/No Toggle' },
  { value: 'SELECTION_INLINE', label: 'Radio/Inline Selection' },
  { value: 'SELECTION_DROPDOWN', label: 'Dropdown Selection' },
  { value: 'READONLY', label: 'Read-only Reference' },
];

export const PropertyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    schema, selectedSectionId, selectedFieldId, 
    updateSection, updateField, setReportTemplatePath
  } = useDesignerStore();
  const [grouperOpen, setGrouperOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const section = selectedSectionId ? schema.sections.find(s => s.id === selectedSectionId) : null;
  const field = selectedFieldId && section ? (
    section.fields?.find(f => f.id === selectedFieldId) || 
    section.columns?.find(c => c.id === selectedFieldId) || 
    section.dataColumns?.find(d => d.id === selectedFieldId)
  ) : null;

  // Integrated state logging - visible in browser console
  React.useEffect(() => {
    if (selectedFieldId) {
      console.log(`[Designer] Sidepanel Focusing Field: ${selectedFieldId}`, field);
    } else if (selectedSectionId) {
      console.log(`[Designer] Sidepanel Focusing Section: ${selectedSectionId}`, section);
    }
  }, [selectedFieldId, selectedSectionId, field, section]);

  const handleUpdate = (updates: Partial<FieldSchema>) => {
    if (!selectedFieldId || !section) return;
    updateField(section.id, selectedFieldId, updates);
  };

  const renderContent = () => {
    // 1. If a FIELD is selected, always show Field Properties
    if (selectedFieldId) {
      if (!field) {
        return (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <AntText type="secondary">Field data not found in store.</AntText>
            <br/><AntText type="secondary" style={{ fontSize: 10 }}>ID: {selectedFieldId}</AntText>
          </div>
        );
      }

      return (
        <Form layout="vertical" key={`field-${selectedFieldId}`}>
          <div style={{ marginBottom: 16, color: '#1677ff', fontWeight: 600 }}>
             Editing Field
          </div>
          <Form.Item label="Label">
            <Input value={field.label} onChange={e => handleUpdate({ label: e.target.value })} />
          </Form.Item>
          <Form.Item label="Field Type">
            <Select<InputType> value={field.inputType} onChange={v => handleUpdate({ inputType: v })} options={INPUT_TYPES} />
          </Form.Item>

          {field.inputType === 'NUMERIC' && (
            <Form.Item label="Precision (Decimal Places)">
              <InputNumber min={0} value={field.precision} onChange={v => handleUpdate({ precision: v || 0 })} />
            </Form.Item>
          )}

          {field.inputType === 'CALCULATED' && (
            <>
              <Form.Item label="Formula" help="E.g. {mass} / {volume}" style={{ marginBottom: 8 }}>
                <FormulaBuilder value={field.formula || ''} onChange={(v: string) => handleUpdate({ formula: v })} currentSectionId={section?.id} />
              </Form.Item>
              {field.originalFormula && (
                <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '8px', borderRadius: '4px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Original Excel Formula:</div>
                  <code style={{ fontSize: 12, color: '#d46b08', wordBreak: 'break-all' }}>{field.originalFormula}</code>
                </div>
              )}
            </>
          )}

          <Form.Item label="Unit">
            <Input value={field.unit} onChange={e => handleUpdate({ unit: e.target.value })} />
          </Form.Item>

          <Form.Item label="Visibility Condition" help="Leave blank if always visible.">
            <ConditionBuilder value={field.visibilityCondition || ''} onChange={(v: string) => handleUpdate({ visibilityCondition: v })} currentSectionId={section?.id} />
          </Form.Item>
          
          <Form.Item label="Required">
            <Switch checked={field.required} onChange={v => handleUpdate({ required: v })} />
          </Form.Item>
          <Form.Item label="System Mapping" help="Auto-prefill with system data.">
            <Select 
              allowClear 
              value={field.systemMapping} 
              onChange={v => handleUpdate({ systemMapping: v })}
              options={[
                { value: 'sample.sampleNumber', label: 'Sample Number' },
                { value: 'sample.job.jobNumber', label: 'Job Number' },
                { value: 'sample.job.client.name', label: 'Client Name' },
                { value: 'sample.product.name', label: 'Product Name' },
                { value: 'sample.job.projectName', label: 'Project Name' },
                { value: 'sample.job.poNumber', label: 'PO Number' },
                { value: 'sample.sampledAt', label: 'Sampling Date' },
                { value: 'sample.receivedAt', label: 'Received Date' },
              ]}
            />
          </Form.Item>
          <Divider />
          <Form.Item label="COA Final Result" help="Extract this field's value for the final report.">
            <Switch checked={field.isFinalResult} onChange={v => handleUpdate({ isFinalResult: v })} />
          </Form.Item>
        </Form>
      );
    }

    // 2. If no field, but a SECTION is selected, show Section Properties
    if (section) {
      return (
        <Form layout="vertical" key={`section-${section.id}`}>
          <Form.Item label="Section Title">
            <Input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })} />
          </Form.Item>
          <Form.Item label="Description">
            <Input.TextArea value={section.description} onChange={e => updateSection(section.id, { description: e.target.value })} />
          </Form.Item>
          
          <Form.Item label="Visibility Condition">
            <ConditionBuilder value={section.visibilityCondition || ''} onChange={(v: string) => updateSection(section.id, { visibilityCondition: v })} currentSectionId={section.id} />
          </Form.Item>

          {(section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') && (
            <>
              <Divider>Table Settings</Divider>
              <Form.Item label="Orientation">
                <Select<TableOrientation>
                  value={section.orientation || 'ROWS_AS_RECORDS'}
                  onChange={v => updateSection(section.id, { orientation: v })}
                  options={[{ value: 'ROWS_AS_RECORDS', label: 'Dynamic Rows' }, { value: 'COLUMNS_AS_TRIALS', label: 'Dynamic Columns' }]}
                />
              </Form.Item>
              <Form.Item label={section.orientation === 'COLUMNS_AS_TRIALS' ? "Min Columns" : "Min Rows"}>
                <InputNumber min={1} value={section.minRows} onChange={v => updateSection(section.id, { minRows: v || undefined })} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label={section.orientation === 'COLUMNS_AS_TRIALS' ? "Max Columns" : "Max Rows"}>
                <InputNumber min={1} value={section.maxRows} onChange={v => updateSection(section.id, { maxRows: v || undefined })} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="default" block onClick={() => setGrouperOpen(true)}>Configure Merged Headers</Button>
                {grouperOpen && <ColumnGroupEditor sectionId={section.id} isOpen={grouperOpen} onClose={() => setGrouperOpen(false)} />}
              </Form.Item>
            </>
          )}

          <Divider />
          <Button icon={<BookOutlined />} block onClick={async () => {
              try {
                  await axios.post('/api/v1/admin/section-templates', {
                      name: section.title || 'Untitled Section',
                      description: section.description,
                      category: 'General',
                      schemaDefinition: section
                  });
                  message.success('Saved to palette');
              } catch (err) {
                  message.error('Save failed');
              }
          }}>Save as Template</Button>
        </Form>
      );
    }

    // 3. DEFAULT: Method Settings (Excel Upload)
    const isNew = id === 'new' || !id;

    return (
      <div key="method-settings">
        <Title level={5}>Method Settings</Title>
        <Divider />
        <Form layout="vertical">
             <Form.Item label="COA Excel Template">
                {isNew ? (
                    <div style={{ padding: '12px', backgroundColor: '#fffbe6', borderRadius: '4px', border: '1px solid #ffe58f' }}>
                        <AntText type="secondary" style={{ fontSize: 13, color: '#d46b08' }}>
                           COA Template upload will be available after you publish this new method.
                        </AntText>
                    </div>
                ) : schema.reportTemplatePath ? (
                    <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#f6ffed', 
                        borderRadius: '4px', 
                        border: '1px solid #b7eb8f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Space>
                            <FileExcelOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#389e0d' }}>Template Linked</div>
                                <div style={{ fontSize: 11, color: '#73d13d' }}>
                                    {schema.reportTemplatePath.split(/[/\\]/).pop()}
                                </div>
                            </div>
                        </Space>
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<CloseOutlined style={{ fontSize: 10 }} />} 
                            onClick={() => setReportTemplatePath(undefined)}
                        />
                    </div>
                ) : (
                    <>
                        <Upload 
                            name="file" 
                            action={`/api/v1/test-methods/${id}/definitions/template`}
                            headers={{ Authorization: `Bearer ${useAuthStore.getState().token}` }}
                            showUploadList={false}
                            onChange={(info) => {
                                if (info.file.status === 'uploading') {
                                    setIsUploading(true);
                                } else if (info.file.status === 'done') {
                                    setIsUploading(false);
                                    const uploadedPath = info.file.response?.reportTemplatePath || info.file.response?.data?.reportTemplatePath;
                                    setReportTemplatePath(uploadedPath);
                                    message.success('COA Template uploaded successfully');
                                } else if (info.file.status === 'error') {
                                    setIsUploading(false);
                                    const errMsg = info.file.response?.message || 'Server error';
                                    message.error(`Upload failed: ${errMsg}`);
                                }
                            }}
                        >
                            <Button icon={<UploadOutlined />} block loading={isUploading}>Upload Template</Button>
                        </Upload>
                        <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: 12 }}>Upload .xlsx with {`{tags}`}.</div>
                    </>
                )}
            </Form.Item>
            <div style={{ padding: '12px', backgroundColor: '#e6f4ff', borderRadius: '4px', border: '1px solid #91caff' }}>
                <AntText type="secondary" style={{ fontSize: 12 }}>Use the **Cheat Sheet** to map your Excel cells.</AntText>
            </div>
        </Form>
        <div style={{ marginTop: 24, color: '#999', fontSize: 13 }}>Select any element to edit its properties.</div>
      </div>
    );
  };

  return (
    <div style={{ width: 320, padding: 16, borderLeft: '1px solid #f0f0f0', background: '#fafafa', overflowY: 'auto' }}>
      <Title level={5}>Properties</Title>
      {renderContent()}
    </div>
  );
};
