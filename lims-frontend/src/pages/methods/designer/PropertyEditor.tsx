import React from 'react';
import { useParams } from 'react-router-dom';
import { Form, Input, Select, InputNumber, Switch, Typography, Divider, Button, Upload, message, Space, Card, Modal, Tooltip } from 'antd';
import { UploadOutlined, BookOutlined, FileExcelOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { InputType, TableOrientation, FieldSchema, SectionType } from './types';
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

interface PropertyEditorProps {
  onCollapse?: () => void;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ onCollapse }) => {
  const { id } = useParams<{ id: string }>();
  const { 
    schema, selectedSectionId, selectedFieldId, 
    updateSection, updateField, removeField, setReportTemplatePath,
    addRowHeader, updateRowHeader, removeRowHeader, convertSectionType
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
          {section?.type !== 'MATRIX_TABLE' && (
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
                  { value: 'audit.testedBy.displayName', label: 'Tested By (Full Name) [On Submit]' },
                  { value: 'audit.testedBy.username', label: 'Tested By (Username) [On Submit]' },
                  { value: 'audit.testedAt.datetime', label: 'Tested Date & Time [On Submit]' },
                  { value: 'audit.testedBy.signature', label: 'Tested By Signature [On Submit]' },
                  { value: 'audit.reviewedBy.displayName', label: 'Reviewed By (Full Name) [On Finalize]' },
                  { value: 'audit.reviewedBy.username', label: 'Reviewed By (Username) [On Finalize]' },
                  { value: 'audit.reviewedAt.datetime', label: 'Reviewed Date & Time [On Finalize]' },
                  { value: 'audit.reviewedBy.signature', label: 'Reviewed By Signature [On Finalize]' },
                  { value: 'audit.authorizedBy.displayName', label: 'Authorized By (Full Name) [On Authorize]' },
                  { value: 'audit.authorizedBy.username', label: 'Authorized By (Username) [On Authorize]' },
                  { value: 'audit.authorizedAt.datetime', label: 'Authorized Date & Time [On Authorize]' },
                  { value: 'audit.authorizedBy.signature', label: 'Authorized By Signature [On Authorize]' },
                ]}
              />
            </Form.Item>
          )}
          {field.inputType === 'NUMERIC' && (
            <Form.Item label="Instrument Integration" help="Link this field to direct instrument data capture.">
              <Select 
                allowClear 
                value={field.instrumentSource} 
                onChange={v => handleUpdate({ instrumentSource: v })}
                options={[
                  { value: 'ADR_TOUCH', label: 'ELE ADR Touch' },
                  { value: 'NL_5032X', label: 'NL Scientific 5032X/001 EDG' },
                  { value: 'GENERIC_SERIAL', label: 'Generic Serial RS-232' },
                ]}
              />
            </Form.Item>
          )}
          {section?.type === 'MATRIX_TABLE' && (
            <>
              <Divider>Cell System Mappings</Divider>
              <AntText type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                Map cells in column "{field.label || field.id}" to system data for each row header.
              </AntText>
              {(section.rowHeaders || []).map(rh => {
                const cellKey = `${rh.id}_${field.id}`;
                const currentMapping = section.cellMappings?.[cellKey];
                return (
                  <div key={rh.id} style={{ marginBottom: 8, padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
                    <AntText strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Row: {rh.label}</AntText>
                    <Select
                      size="small"
                      allowClear
                      placeholder="No System Mapping"
                      style={{ width: '100%' }}
                      value={currentMapping}
                      onChange={(v) => {
                        const newCellMappings = { ...(section.cellMappings || {}) };
                        if (v) {
                          newCellMappings[cellKey] = v;
                        } else {
                          delete newCellMappings[cellKey];
                        }
                        updateSection(section.id, { cellMappings: newCellMappings });
                      }}
                      options={[
                        { value: 'sample.sampleNumber', label: 'Sample Number' },
                        { value: 'sample.job.jobNumber', label: 'Job Number' },
                        { value: 'sample.job.client.name', label: 'Client Name' },
                        { value: 'sample.product.name', label: 'Product Name' },
                        { value: 'sample.job.projectName', label: 'Project Name' },
                        { value: 'sample.job.poNumber', label: 'PO Number' },
                        { value: 'sample.sampledAt', label: 'Sampling Date' },
                        { value: 'sample.receivedAt', label: 'Received Date' },
                        { value: 'audit.testedBy.displayName', label: 'Tested By (Full Name) [On Submit]' },
                        { value: 'audit.testedBy.username', label: 'Tested By (Username) [On Submit]' },
                        { value: 'audit.testedAt.datetime', label: 'Tested Date & Time [On Submit]' },
                        { value: 'audit.testedBy.signature', label: 'Tested By Signature [On Submit]' },
                        { value: 'audit.reviewedBy.displayName', label: 'Reviewed By (Full Name) [On Finalize]' },
                        { value: 'audit.reviewedBy.username', label: 'Reviewed By (Username) [On Finalize]' },
                        { value: 'audit.reviewedAt.datetime', label: 'Reviewed Date & Time [On Finalize]' },
                        { value: 'audit.reviewedBy.signature', label: 'Reviewed By Signature [On Finalize]' },
                        { value: 'audit.authorizedBy.displayName', label: 'Authorized By (Full Name) [On Authorize]' },
                        { value: 'audit.authorizedBy.username', label: 'Authorized By (Username) [On Authorize]' },
                        { value: 'audit.authorizedAt.datetime', label: 'Authorized Date & Time [On Authorize]' },
                        { value: 'audit.authorizedBy.signature', label: 'Authorized By Signature [On Authorize]' },
                      ]}
                    />
                  </div>
                );
              })}
            </>
          )}
        </Form>
      );
    }

    // 2. If no field, but a SECTION is selected, show Section Properties
    if (section) {
      const isConvertible = ['SINGLE_VALUE', 'DATA_TABLE', 'GROUPED_TABLE', 'MATRIX_TABLE', 'EQUIPMENT'].includes(section.type);

      return (
        <Form layout="vertical" key={`section-${section.id}`}>
          {isConvertible && (
            <Form.Item label="Section Type">
              <Select<SectionType>
                value={section.type}
                onChange={v => {
                  if (v === section.type) return;
                  Modal.confirm({
                    title: 'Convert Section Type',
                    content: 'Changing the section type will preserve the fields, but it resets table-specific settings and may break formulas in other sections that reference this one. Do you want to continue?',
                    okText: 'Convert',
                    cancelText: 'Cancel',
                    onOk: () => convertSectionType(section.id, v)
                  });
                }}
                options={[
                  { value: 'SINGLE_VALUE', label: 'Flat Fields' },
                  { value: 'DATA_TABLE', label: 'Data Table' },
                  { value: 'GROUPED_TABLE', label: 'Grouped Table' },
                  { value: 'MATRIX_TABLE', label: 'Matrix Table' },
                  { value: 'EQUIPMENT', label: 'Equipment Registry' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item label="Section Title">
            <Input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })} />
          </Form.Item>
          <Form.Item label="Description">
            <Input.TextArea value={section.description} onChange={e => updateSection(section.id, { description: e.target.value })} />
          </Form.Item>
          
          <Form.Item label="Visibility Condition">
            <ConditionBuilder value={section.visibilityCondition || ''} onChange={(v: string) => updateSection(section.id, { visibilityCondition: v })} currentSectionId={section.id} />
          </Form.Item>

          <Form.Item 
            label="Contains Specimen/Test Result Data" 
            help={section.hasMultiDaySpecimen ? "Locked to true because Multi-Day Specimen Lifecycle is enabled" : "When enabled, Reviewers and Authorizers cannot edit fields in this section"}
          >
            <Switch 
              checked={section.hasMultiDaySpecimen ? true : section.isSpecimenData !== false} 
              disabled={section.hasMultiDaySpecimen === true} 
              onChange={v => updateSection(section.id, { isSpecimenData: v })} 
            />
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
              {section.orientation === 'COLUMNS_AS_TRIALS' && (
                <Form.Item label="Multi-Day Specimen Lifecycle" help="Enable independent testing & authorization lifecycle for each column/specimen">
                  <Switch 
                    checked={section.hasMultiDaySpecimen} 
                    onChange={v => updateSection(section.id, { hasMultiDaySpecimen: v, ...(v ? { isSpecimenData: true } : {}) })} 
                  />
                </Form.Item>
              )}
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

          {section.type === 'MATRIX_TABLE' && (
            <>
              <Divider>Matrix Settings</Divider>
              <Divider>Matrix Columns</Divider>
              {(section.columns || []).map((col, index) => (
                <Card size="small" style={{ marginBottom: 12, border: '1px solid #d9d9d9' }} key={col.id}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AntText strong style={{ fontSize: 12 }}>Column {index + 1}</AntText>
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeField(section.id, col.id)} 
                      />
                   </div>
                   <div style={{ marginTop: 8 }}>
                      <Input 
                        size="small"
                        placeholder="Column Label" 
                        value={col.label} 
                        onChange={e => updateField(section.id, col.id, { label: e.target.value })} 
                      />
                   </div>
                </Card>
              ))}
              <Button 
                type="dashed" 
                block 
                icon={<PlusOutlined />} 
                onClick={() => useDesignerStore.getState().addField(section.id)}
              >
                Add Column
              </Button>
            </>
          )}
              
          {(section.type === 'MATRIX_TABLE' || section.type === 'EQUIPMENT') && (
            <>
              <Divider>Row Definitions</Divider>
              {(section.rowHeaders || []).map((rh, index) => (
                <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f9f9f9' }} key={rh.id}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AntText strong>Row {index + 1}</AntText>
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeRowHeader(section.id, rh.id)} 
                      />
                    </div>
                    <Input 
                      placeholder={section.type === 'EQUIPMENT' ? "Equipment Name (e.g. Weighing Balance)" : "Row Label (e.g. Tested by)"} 
                      value={rh.label} 
                      onChange={e => updateRowHeader(section.id, rh.id, { label: e.target.value })} 
                    />
                  </Space>
                </Card>
              ))}
              <Button 
                type="dashed" 
                block 
                icon={<PlusOutlined />} 
                onClick={() => addRowHeader(section.id)}
              >
                {section.type === 'EQUIPMENT' ? 'Add Equipment' : 'Add Row Header'}
              </Button>
            </>
          )}

          {section.type === 'MATRIX_TABLE' && (
            <>
              <Divider>Header Configuration</Divider>
              <Form.Item>
                <Button type="default" block onClick={() => setGrouperOpen(true)}>Configure Merged Headers</Button>
                {grouperOpen && <ColumnGroupEditor sectionId={section.id} isOpen={grouperOpen} onClose={() => setGrouperOpen(false)} />}
              </Form.Item>

              <Divider>Cell System Mappings</Divider>
              <AntText type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                Map specific matrix cells to system data.
              </AntText>
              {(section.rowHeaders || []).map(rh => (
                <div key={rh.id} style={{ marginBottom: 12, padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
                  <AntText strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Row: {rh.label}</AntText>
                  {(section.columns || []).map(col => {
                    const cellKey = `${rh.id}_${col.id}`;
                    const currentMapping = section.cellMappings?.[cellKey];
                    return (
                      <div key={cellKey} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Column: {col.label}</div>
                        <Select
                          size="small"
                          allowClear
                          placeholder="No System Mapping"
                          style={{ width: '100%' }}
                          value={currentMapping}
                          onChange={(v) => {
                            const newCellMappings = { ...(section.cellMappings || {}) };
                            if (v) {
                              newCellMappings[cellKey] = v;
                            } else {
                              delete newCellMappings[cellKey];
                            }
                            updateSection(section.id, { cellMappings: newCellMappings });
                          }}
                          options={[
                            { value: 'sample.sampleNumber', label: 'Sample Number' },
                            { value: 'sample.job.jobNumber', label: 'Job Number' },
                            { value: 'sample.job.client.name', label: 'Client Name' },
                            { value: 'sample.product.name', label: 'Product Name' },
                            { value: 'sample.job.projectName', label: 'Project Name' },
                            { value: 'sample.job.poNumber', label: 'PO Number' },
                            { value: 'sample.sampledAt', label: 'Sampling Date' },
                            { value: 'sample.receivedAt', label: 'Received Date' },
                            { value: 'audit.testedBy.displayName', label: 'Tested By (Full Name) [On Submit]' },
                            { value: 'audit.testedBy.username', label: 'Tested By (Username) [On Submit]' },
                            { value: 'audit.testedAt.datetime', label: 'Tested Date & Time [On Submit]' },
                            { value: 'audit.testedBy.signature', label: 'Tested By Signature [On Submit]' },
                            { value: 'audit.reviewedBy.displayName', label: 'Reviewed By (Full Name) [On Finalize]' },
                            { value: 'audit.reviewedBy.username', label: 'Reviewed By (Username) [On Finalize]' },
                            { value: 'audit.reviewedAt.datetime', label: 'Reviewed Date & Time [On Finalize]' },
                            { value: 'audit.reviewedBy.signature', label: 'Reviewed By Signature [On Finalize]' },
                            { value: 'audit.authorizedBy.displayName', label: 'Authorized By (Full Name) [On Authorize]' },
                            { value: 'audit.authorizedBy.username', label: 'Authorized By (Username) [On Authorize]' },
                            { value: 'audit.authorizedAt.datetime', label: 'Authorized Date & Time [On Authorize]' },
                            { value: 'audit.authorizedBy.signature', label: 'Authorized By Signature [On Authorize]' },
                          ]}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
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
    <div style={{ width: 320, minWidth: 320, height: '100%', padding: 16, borderLeft: '1px solid #f0f0f0', background: '#fafafa', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Properties</Title>
        {onCollapse && (
          <Tooltip title="Collapse Properties">
            <Button 
              type="text" 
              size="small" 
              icon={<MenuFoldOutlined />} 
              onClick={onCollapse} 
              style={{ color: '#8c8c8c' }}
            />
          </Tooltip>
        )}
      </div>
      {renderContent()}
    </div>
  );
};
