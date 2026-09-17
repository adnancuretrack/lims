import React, { useState, useMemo } from 'react';
import {
  Modal,
  Steps,
  Upload,
  Button,
  Table,
  Select,
  Radio,
  Input,
  InputNumber,
  Alert,
  Tag,
  Typography,
  Space,
  Divider,
  Card,
  message,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  FileExcelOutlined,
  SwapOutlined,
  ClearOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { SectionSchema, FieldSchema } from '../../pages/methods/designer/types';

const { Text } = Typography;
const { Dragger } = Upload;

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  section: SectionSchema;
  existingRowCount: number;
  specimenStatuses?: any[];
  onImport: (rows: Record<string, any>[], mode: 'append' | 'replace') => void;
}

interface CsvColumnInfo {
  index: number;
  header: string;
  sampleValues: string[];
}

export type FieldMapping =
  | { type: 'single'; columnIndex: number }
  | { type: 'composite'; columns: number[]; separator: string };

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  open,
  onClose,
  section,
  existingRowCount,
  specimenStatuses,
  onImport,
}) => {
  const isColumnsAsTrials = section.orientation === 'COLUMNS_AS_TRIALS';
  const unitNoun = isColumnsAsTrials ? 'trial' : 'row';
  const unitNounPlural = isColumnsAsTrials ? 'trials' : 'rows';

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Parsed CSV data
  const [fileName, setFileName] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvColumns, setCsvColumns] = useState<CsvColumnInfo[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<any[][]>([]);

  // Mapping state: fieldId -> FieldMapping
  const [mappings, setMappings] = useState<Record<string, FieldMapping>>({});

  // Range and mode state
  const [importMode, setImportMode] = useState<'append' | 'replace'>(
    existingRowCount > 0 ? 'append' : 'replace'
  );
  const [startRow, setStartRow] = useState<number>(1);
  const [endRow, setEndRow] = useState<number>(1);

  // Target fields from section
  const targetFields: FieldSchema[] = useMemo(() => {
    const rawFields = section.columns || section.dataColumns || [];
    return rawFields.filter(
      (f) =>
        f.inputType !== 'CALCULATED' &&
        f.inputType !== 'READONLY' &&
        !f.instrumentSource
    );
  }, [section]);

  // Reset all state when closing or reopening
  const handleModalClose = () => {
    setCurrentStep(0);
    setFileName('');
    setCsvHeaders([]);
    setCsvColumns([]);
    setCsvRawRows([]);
    setMappings({});
    setImportMode(existingRowCount > 0 ? 'append' : 'replace');
    setStartRow(1);
    setEndRow(1);
    onClose();
  };

  // ----------------------------------------------------
  // Step 1: File Upload & Parsing
  // ----------------------------------------------------
  const handleFileUpload = (file: File) => {
    const isSupported =
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls');

    if (!isSupported) {
      message.error('Please upload a valid .csv, .xlsx, or .xls file.');
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
          header: 1,
          defval: '',
        });

        // Filter empty rows
        const nonEmptyRows = rows.filter(
          (r) =>
            Array.isArray(r) &&
            r.some((cell) => cell !== '' && cell !== null && cell !== undefined)
        );

        if (nonEmptyRows.length < 2) {
          message.error(
            'The uploaded file must contain a header row and at least one data row.'
          );
          return;
        }

        // Header row
        const rawHeaders: string[] = (nonEmptyRows[0] || []).map((h: any, idx: number) => {
          const s = String(h ?? '').trim();
          return s || `Column ${idx + 1}`;
        });

        // Data rows
        const dataRows = nonEmptyRows.slice(1);

        // Build column previews
        const colInfos: CsvColumnInfo[] = rawHeaders.map((header, idx) => {
          const sampleValues = dataRows
            .slice(0, 3)
            .map((r) => String(r[idx] ?? '').trim())
            .filter((v) => v !== '');
          return {
            index: idx,
            header,
            sampleValues,
          };
        });

        setFileName(file.name);
        setCsvHeaders(rawHeaders);
        setCsvColumns(colInfos);
        setCsvRawRows(dataRows);
        setStartRow(1);
        setEndRow(dataRows.length);

        // Run auto-match
        runAutoMatch(rawHeaders, targetFields);

        message.success(`Successfully parsed ${dataRows.length} data rows from ${file.name}`);
        setCurrentStep(1);
      } catch (err) {
        console.error('CSV parse error:', err);
        message.error('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
      }
    };

    reader.readAsArrayBuffer(file);
    return false; // Prevent upload action
  };

  // ----------------------------------------------------
  // Mapping Helpers & Auto-Match Heuristic
  // ----------------------------------------------------
  const isFieldMapped = (m: FieldMapping | undefined): boolean => {
    if (!m) return false;
    if (m.type === 'single') return m.columnIndex !== -1;
    return m.columns.length > 0;
  };

  const resolveMapping = (m: FieldMapping | undefined, csvRow: any[]): string | null => {
    if (!m) return null;
    if (m.type === 'single') {
      const idx = m.columnIndex;
      if (idx === -1 || idx >= csvRow.length) return null;
      const val = csvRow[idx];
      return val !== undefined && val !== null && String(val).trim() !== ''
        ? String(val).trim()
        : null;
    }
    // Composite
    const parts = m.columns
      .filter((idx) => idx >= 0 && idx < csvRow.length)
      .map((idx) => String(csvRow[idx] ?? '').trim())
      .filter((p) => p !== '');
    return parts.length > 0 ? parts.join(m.separator) : null;
  };

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const runAutoMatch = (headers: string[], fields: FieldSchema[]) => {
    const newMappings: Record<string, FieldMapping> = {};

    fields.forEach((field) => {
      const fieldLabelNorm = normalize(field.label || '');
      const fieldIdNorm = normalize(field.id || '');

      // 1. Exact normalized match with label or id
      let matchIdx = headers.findIndex((h) => {
        const hNorm = normalize(h);
        return hNorm === fieldLabelNorm || hNorm === fieldIdNorm;
      });

      // 2. Partial containment match (if length >= 3)
      if (matchIdx === -1) {
        matchIdx = headers.findIndex((h) => {
          const hNorm = normalize(h);
          if (hNorm.length < 3) return false;
          return fieldLabelNorm.includes(hNorm) || hNorm.includes(fieldLabelNorm);
        });
      }

      if (matchIdx !== -1) {
        newMappings[field.id] = { type: 'single', columnIndex: matchIdx };
      } else {
        newMappings[field.id] = { type: 'single', columnIndex: -1 };
      }
    });

    setMappings(newMappings);
  };

  const handleClearMappings = () => {
    const cleared: Record<string, FieldMapping> = {};
    targetFields.forEach((f) => {
      cleared[f.id] = { type: 'single', columnIndex: -1 };
    });
    setMappings(cleared);
  };

  const handleAutoMatchClick = () => {
    runAutoMatch(csvHeaders, targetFields);
    message.info('Auto-matched columns based on field names and labels.');
  };

  // Mapped count
  const mappedCount = useMemo(() => {
    return Object.values(mappings).filter((m) => isFieldMapped(m)).length;
  }, [mappings]);

  // ----------------------------------------------------
  // Step 3: Range & Preview Calculations
  // ----------------------------------------------------
  const totalCsvRows = csvRawRows.length;
  const clampedStart = Math.max(1, Math.min(startRow, totalCsvRows || 1));
  const clampedEnd = Math.max(clampedStart, Math.min(endRow, totalCsvRows || 1));
  const selectedRowCount = Math.max(0, clampedEnd - clampedStart + 1);

  const resultingTotalCount =
    importMode === 'append'
      ? existingRowCount + selectedRowCount
      : selectedRowCount;

  const exceedsMaxRows =
    section.maxRows !== undefined &&
    section.maxRows !== null &&
    section.maxRows > 0 &&
    resultingTotalCount > section.maxRows;

  // Finalized multi-day specimens check
  const authorizedSpecimens = useMemo(() => {
    if (!section.hasMultiDaySpecimen || !specimenStatuses) return [];
    return specimenStatuses.filter((s: any) => s.status === 'AUTHORIZED');
  }, [section.hasMultiDaySpecimen, specimenStatuses]);

  // Generate preview dataset from clamped range
  const previewData = useMemo(() => {
    if (csvRawRows.length === 0) return [];
    const startIndex = clampedStart - 1;
    const endIndex = clampedEnd;
    const slice = csvRawRows.slice(startIndex, endIndex);

    return slice.slice(0, 10).map((row, idx) => {
      const record: Record<string, any> = {
        _csvRowIndex: startIndex + idx + 1,
      };
      targetFields.forEach((field) => {
        const m = mappings[field.id];
        if (isFieldMapped(m)) {
          record[field.id] = resolveMapping(m, row);
        } else {
          record[field.id] = null;
        }
      });
      return record;
    });
  }, [csvRawRows, clampedStart, clampedEnd, mappings, targetFields]);

  // ----------------------------------------------------
  // Execute Import
  // ----------------------------------------------------
  const handleExecuteImport = () => {
    if (mappedCount === 0) {
      message.error('Please map at least one field to import.');
      setCurrentStep(1);
      return;
    }

    if (selectedRowCount <= 0) {
      message.error('Selected row range contains no rows.');
      return;
    }

    const startIndex = clampedStart - 1;
    const endIndex = clampedEnd;
    const slice = csvRawRows.slice(startIndex, endIndex);

    const importedRows: Record<string, any>[] = slice.map((csvRow) => {
      const rowRecord: Record<string, any> = {};

      targetFields.forEach((field) => {
        const m = mappings[field.id];
        if (isFieldMapped(m)) {
          const val = resolveMapping(m, csvRow);
          if (val !== null && val !== '') {
            if (m.type === 'single') {
              if (field.inputType === 'NUMERIC') {
                const num = Number(val);
                rowRecord[field.id] = isNaN(num) ? val : num;
              } else if (field.inputType === 'CHECKBOX' || field.inputType === 'YES_NO') {
                const s = val.toLowerCase();
                rowRecord[field.id] = s === 'true' || s === '1' || s === 'yes';
              } else {
                rowRecord[field.id] = val;
              }
            } else {
              // Composite mapping produces formatted string
              rowRecord[field.id] = val;
            }
          }
        }
      });

      return rowRecord;
    });

    onImport(importedRows, importMode);
    message.success(`Successfully imported ${importedRows.length} ${isColumnsAsTrials ? 'trials' : 'records'}.`);
    handleModalClose();
  };

  // ----------------------------------------------------
  // Render Step Content
  // ----------------------------------------------------
  return (
    <Modal
      title={
        <Space align="center" style={{ fontSize: 16, fontWeight: 600 }}>
          <FileExcelOutlined style={{ color: '#1677ff' }} />
          <span>Import Data from CSV / Excel &mdash; {section.title || section.id}</span>
        </Space>
      }
      open={open}
      onCancel={handleModalClose}
      width={850}
      style={{ top: 24 }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep((prev) => prev - 1)}>
                Back
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={handleModalClose}>Cancel</Button>
            {currentStep === 0 && (
              <Button
                type="primary"
                disabled={csvRawRows.length === 0}
                onClick={() => setCurrentStep(1)}
              >
                Next: Map Columns <ArrowRightOutlined />
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                type="primary"
                disabled={mappedCount === 0}
                onClick={() => setCurrentStep(2)}
              >
                Next: Configure & Preview <ArrowRightOutlined />
              </Button>
            )}
            {currentStep === 2 && (
              <Button
                type="primary"
                icon={<UploadOutlined />}
                disabled={selectedRowCount <= 0 || mappedCount === 0}
                onClick={handleExecuteImport}
              >
                Import {selectedRowCount} {selectedRowCount === 1 ? unitNoun : unitNounPlural}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        current={currentStep}
        onChange={(s) => {
          if (s === 0 || (s === 1 && csvRawRows.length > 0) || (s === 2 && mappedCount > 0)) {
            setCurrentStep(s);
          }
        }}
        items={[
          { title: 'Upload File', description: fileName || 'CSV or Excel' },
          {
            title: 'Map Columns',
            description: mappedCount > 0 ? `${mappedCount} of ${targetFields.length} mapped` : 'Field mapping',
          },
          { title: 'Preview & Import', description: `${selectedRowCount} ${unitNounPlural}` },
        ]}
        style={{ marginBottom: 24, marginTop: 8 }}
      />

      {/* STEP 0: Upload */}
      {currentStep === 0 && (
        <div style={{ padding: '8px 0' }}>
          <Dragger
            accept=".csv, .xlsx, .xls"
            showUploadList={false}
            beforeUpload={handleFileUpload}
            style={{
              padding: '36px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '2px dashed #d9d9d9',
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500, margin: '12px 0 6px' }}>
              Click or drag CSV or Excel file to this area to parse
            </p>
            <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
              Supports .csv, .xlsx, and .xls files. The first row should contain header column names.
            </p>
          </Dragger>

          {fileName && (
            <Card
              size="small"
              style={{ marginTop: 16, borderColor: '#b7eb8f', background: '#f6ffed' }}
            >
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <div>
                  <Text strong>{fileName}</Text>
                  <div style={{ fontSize: 12, color: '#595959' }}>
                    Detected {csvHeaders.length} columns and {csvRawRows.length} data rows.
                  </div>
                </div>
              </Space>
            </Card>
          )}

          <div style={{ marginTop: 20, padding: 12, background: '#f0f5ff', borderRadius: 6, border: '1px solid #d6e4ff' }}>
            <Space orientation="horizontal" align="start">
              <InfoCircleOutlined style={{ color: '#1677ff', marginTop: 2 }} />
              <div style={{ fontSize: 13, color: '#1d39c4' }}>
                <Text strong style={{ color: '#1d39c4' }}>How CSV import works for this table:</Text>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  <li>Each row in your CSV will be imported as a {isColumnsAsTrials ? 'trial column' : 'table row'}.</li>
                  <li>In the next step, you will be able to map each table field to any column in your CSV.</li>
                  <li>Calculated fields and instrument-linked fields are automatically omitted from mapping.</li>
                </ul>
              </div>
            </Space>
          </div>
        </div>
      )}

      {/* STEP 1: Column Mapping */}
      {currentStep === 1 && (
        <div style={{ padding: '4px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <Text strong style={{ fontSize: 14 }}>
                Map CSV Columns to Table Fields
              </Text>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Select which CSV column populates each table field. Unmapped fields will be left blank.
              </div>
            </div>
            <Space>
              <Button size="small" icon={<ClearOutlined />} onClick={handleClearMappings}>
                Clear All
              </Button>
              <Button size="small" type="dashed" icon={<SwapOutlined />} onClick={handleAutoMatchClick}>
                Auto-Match Again
              </Button>
            </Space>
          </div>

          <Table
            dataSource={targetFields}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
            scroll={{ y: 340 }}
            columns={[
              {
                title: 'Table Field',
                key: 'field',
                width: 260,
                render: (_, field) => (
                  <div>
                    <Space size={4}>
                      <Text strong>{field.label || field.id}</Text>
                      {field.unit && <Tag color="blue">{field.unit}</Tag>}
                      {field.required && <Tag color="red">Required</Tag>}
                    </Space>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                      Type: <Tag style={{ fontSize: 10, lineHeight: '16px' }}>{field.inputType || 'TEXT'}</Tag>
                      <span style={{ marginLeft: 6 }}>ID: {field.id}</span>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Mapping',
                key: 'arrow',
                width: 50,
                align: 'center',
                render: (_, field) => {
                  const m = mappings[field.id];
                  const active = isFieldMapped(m);
                  return (
                    <ArrowRightOutlined
                      style={{
                        color: active ? '#52c41a' : '#d9d9d9',
                        fontSize: 16,
                      }}
                    />
                  );
                },
              },
              {
                title: 'CSV Source Column',
                key: 'csvCol',
                render: (_, field) => {
                  const m = mappings[field.id] || { type: 'single', columnIndex: -1 };
                  const isComposite = m.type === 'composite';
                  const active = isFieldMapped(m);
                  const colOptions = csvColumns.map((col) => {
                    const preview = col.sampleValues.length > 0
                      ? ` (e.g. "${col.sampleValues[0]}")`
                      : '';
                    return {
                      value: col.index,
                      label: `${col.header}${preview}`,
                    };
                  });

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isComposite ? (
                          <Select
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            style={{ flex: 1 }}
                            placeholder="Select 2+ CSV columns to combine..."
                            value={m.columns}
                            onChange={(cols: number[]) => {
                              setMappings((prev) => ({
                                ...prev,
                                [field.id]: {
                                  type: 'composite',
                                  columns: cols,
                                  separator: m.separator,
                                },
                              }));
                            }}
                            allowClear
                            options={colOptions}
                          />
                        ) : (
                          <Select
                            showSearch
                            optionFilterProp="label"
                            style={{ flex: 1 }}
                            placeholder="-- Leave blank / Do not import --"
                            value={m.columnIndex !== -1 ? m.columnIndex : undefined}
                            onChange={(val) => {
                              setMappings((prev) => ({
                                ...prev,
                                [field.id]: {
                                  type: 'single',
                                  columnIndex: val !== undefined ? val : -1,
                                },
                              }));
                            }}
                            allowClear
                            onClear={() => {
                              setMappings((prev) => ({
                                ...prev,
                                [field.id]: { type: 'single', columnIndex: -1 },
                              }));
                            }}
                            options={colOptions}
                          />
                        )}

                        <Tooltip
                          title={
                            isComposite
                              ? 'Switch back to single column mapping'
                              : 'Combine multiple CSV columns into this field (e.g. Lat + Long)'
                          }
                        >
                          <Button
                            size="small"
                            type={isComposite ? 'primary' : 'default'}
                            icon={<LinkOutlined />}
                            onClick={() => {
                              if (isComposite) {
                                const firstCol = m.columns.length > 0 ? m.columns[0] : -1;
                                setMappings((prev) => ({
                                  ...prev,
                                  [field.id]: { type: 'single', columnIndex: firstCol },
                                }));
                              } else {
                                const cols = m.columnIndex !== -1 ? [m.columnIndex] : [];
                                setMappings((prev) => ({
                                  ...prev,
                                  [field.id]: {
                                    type: 'composite',
                                    columns: cols,
                                    separator: ', ',
                                  },
                                }));
                              }
                            }}
                          >
                            {isComposite ? 'Composite' : 'Combine'}
                          </Button>
                        </Tooltip>

                        {active && (
                          <Tooltip title="Field mapped">
                            <CheckOutlined style={{ color: '#52c41a' }} />
                          </Tooltip>
                        )}
                      </div>

                      {isComposite && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            background: '#f9f9f9',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: '#595959', whiteSpace: 'nowrap' }}>Separator:</span>
                          <Input
                            size="small"
                            style={{ width: 80 }}
                            value={m.separator}
                            onChange={(e) => {
                              const sep = e.target.value;
                              setMappings((prev) => ({
                                ...prev,
                                [field.id]: {
                                  ...m,
                                  separator: sep,
                                },
                              }));
                            }}
                            placeholder=", "
                          />

                          {csvRawRows.length > 0 && m.columns.length > 0 && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                marginLeft: 'auto',
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ color: '#8c8c8c', whiteSpace: 'nowrap' }}>Preview:</span>
                              <Tag color="cyan" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {resolveMapping(m, csvRawRows[0]) || '(empty)'}
                              </Tag>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Tag color={mappedCount > 0 ? 'green' : 'orange'}>
              {mappedCount} of {targetFields.length} fields mapped
            </Tag>
          </div>
        </div>
      )}

      {/* STEP 2: Range & Preview */}
      {currentStep === 2 && (
        <div style={{ padding: '4px 0' }}>
          {/* Multi-Day Specimen Lifecycle Alert */}
          {section.hasMultiDaySpecimen && authorizedSpecimens.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: 16 }}
              message="Authorized Multi-Day Specimens Detected"
              description={
                <div>
                  There are {authorizedSpecimens.length} authorized specimen(s) in this table.
                  Using <strong>Replace</strong> mode is restricted or will overwrite finalized specimens.
                  We recommend selecting <strong>Append</strong> mode or choosing a row range that targets unfinalized specimens only.
                </div>
              }
            />
          )}

          {/* Exceeds Max Rows Warning */}
          {exceedsMaxRows && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Row Limit Exceeded: Maximum is ${section.maxRows}`}
              description={
                <div>
                  Importing {selectedRowCount} {unitNounPlural} in {importMode} mode results in{' '}
                  <strong>{resultingTotalCount}</strong> total {unitNounPlural}, exceeding the table maximum of{' '}
                  <strong>{section.maxRows}</strong>. Please reduce the CSV row range or switch import modes.
                </div>
              }
            />
          )}

          <Row gutter={16} style={{ marginBottom: 16 }}>
            {/* Import Mode Selector */}
            <Col span={12}>
              <Card size="small" title="Import Strategy">
                <Radio.Group
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="append" disabled={false}>
                      <div>
                        <Text strong>Append to existing data</Text>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          Add {selectedRowCount} new {unitNounPlural} after current {existingRowCount} existing {unitNounPlural}
                          {' '}(Total: {existingRowCount + selectedRowCount})
                        </div>
                      </div>
                    </Radio>
                    <Divider style={{ margin: '6px 0' }} />
                    <Radio
                      value="replace"
                      disabled={section.hasMultiDaySpecimen && authorizedSpecimens.length > 0}
                    >
                      <div>
                        <Text strong>Replace existing data</Text>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          Discard current {existingRowCount} {unitNounPlural} and import {selectedRowCount} new {unitNounPlural}
                        </div>
                      </div>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Card>
            </Col>

            {/* Row Range Selector */}
            <Col span={12}>
              <Card size="small" title={`CSV Data Range (${totalCsvRows} rows total)`}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text>Start Row:</Text>
                    <InputNumber
                      min={1}
                      max={clampedEnd}
                      value={startRow}
                      onChange={(v) => setStartRow(v || 1)}
                      style={{ width: 120 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text>End Row:</Text>
                    <InputNumber
                      min={clampedStart}
                      max={totalCsvRows}
                      value={endRow}
                      onChange={(v) => setEndRow(v || totalCsvRows)}
                      style={{ width: 120 }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      padding: '6px 10px',
                      background: '#f5f5f5',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    Importing CSV rows <strong>#{clampedStart}</strong> to <strong>#{clampedEnd}</strong> ({selectedRowCount} {unitNounPlural})
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Preview Table */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>
                Data Preview (Showing first {Math.min(previewData.length, 10)} of {selectedRowCount} selected {unitNounPlural}):
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Rows with invalid number formats will be highlighted in yellow
              </Text>
            </div>

            <Table
              dataSource={previewData}
              rowKey="_csvRowIndex"
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content', y: 220 }}
              columns={[
                {
                  title: '# CSV Row',
                  dataIndex: '_csvRowIndex',
                  key: '_csvRowIndex',
                  width: 90,
                  fixed: 'left',
                  render: (val) => <Tag color="default">Row #{val}</Tag>,
                },
                ...targetFields
                  .filter((f) => isFieldMapped(mappings[f.id]))
                  .map((f) => ({
                    title: (
                      <div>
                        <span>{f.label || f.id}</span>
                        {f.unit && <span style={{ color: '#8c8c8c', marginLeft: 4 }}>({f.unit})</span>}
                      </div>
                    ),
                    dataIndex: f.id,
                    key: f.id,
                    render: (cellVal: any) => {
                      if (cellVal === null || cellVal === undefined || cellVal === '') {
                        return <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>empty</span>;
                      }

                      // Highlight number conversion issue if inputType is NUMERIC
                      if (f.inputType === 'NUMERIC' && isNaN(Number(cellVal))) {
                        return (
                          <Tooltip title="Expected a numeric value">
                            <Tag color="warning" icon={<WarningOutlined />}>
                              {String(cellVal)}
                            </Tag>
                          </Tooltip>
                        );
                      }

                      return <span>{String(cellVal)}</span>;
                    },
                  })),
              ]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
