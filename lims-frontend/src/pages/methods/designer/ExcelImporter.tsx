import React, { useState } from 'react';
import { Modal, Upload, Button, message, Space, Typography, Card } from 'antd';
import { InboxOutlined, ThunderboltOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useDesignerStore } from './store';
import type { WorksheetSchema, SectionSchema, FieldSchema } from './types';

const { Dragger } = Upload;
const { Paragraph } = Typography;

export const ExcelImporter: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileData, setFileData] = useState<any[][] | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const { setSchema } = useDesignerStore();

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellFormula: true });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true }) as any[][];
        setWorkbook(wb);
        setFileData(jsonData);
        message.success('Excel file parsed successfully. Previewing data...');
      } catch (err) {
        message.error('Failed to parse Excel file.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const translateFormula = (excelFormula: string, colMap: Record<string, string>) => {
    let f = excelFormula.replace('=', '');
    const cellRegex = /\$?[A-Z]+\$?[0-9]+/g;
    return f.replace(cellRegex, (match) => {
      const cleanMatch = match.replace(/\$/g, '');
      return colMap[cleanMatch] ? `{${colMap[cleanMatch]}}` : match;
    });
  };

  const parseCellAsField = (value: string, r: number, c: number, firstSheet: XLSX.WorkSheet) => {
    let label = value.trim();
    if (label.endsWith(':')) label = label.slice(0, -1).trim();
    if (label.startsWith('{{') && label.endsWith('}}')) label = label.slice(2, -2).trim();

    const cellRef = XLSX.utils.encode_cell({ r, c: c + 1 });
    const cell = firstSheet[cellRef];
    
    return {
      id: `${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).slice(2, 5)}`,
      label: label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' '),
      inputType: cell?.f ? 'CALCULATED' : (typeof cell?.v === 'number' ? 'NUMERIC' : 'TEXT'),
      originalFormula: cell?.f ? `=${cell.f}` : undefined,
      value: cell?.v
    } as FieldSchema;
  };

  const processImport = () => {
    if (!fileData || !workbook) return;

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // 1. Separate Metadata labels from potential Table Headers
    const allLabels: { r: number, c: number, field: FieldSchema }[] = [];
    const tableCandidates: number[] = [];

    for (let r = 0; r < fileData.length; r++) {
      let consecutiveDataCells = 0;
      for (let c = 0; c < (fileData[r]?.length || 0); c++) {
        const val = String(fileData[r][c] || '').trim();
        if (!val) {
           consecutiveDataCells = 0;
           continue; 
        }

        // Is it a label?
        if (val.endsWith(':') || (val.startsWith('{{') && val.endsWith('}}'))) {
           allLabels.push({ r, c, field: parseCellAsField(val, r, c, firstSheet) });
           consecutiveDataCells = 0;
        } else {
           consecutiveDataCells++;
        }

        // Potential Table Header
        if (consecutiveDataCells >= 2 && !tableCandidates.includes(r)) {
           const nextRow = fileData[r+1];
           let nextRowCount = 0;
           if (nextRow) {
              for (let j = 0; j < nextRow.length; j++) if (nextRow[j] !== undefined && nextRow[j] !== '') nextRowCount++;
           }
           if (nextRowCount >= 2) tableCandidates.push(r);
        }
      }
    }

    const tableHeaderRowIdx = tableCandidates.length > 0 ? tableCandidates[0] : -1;
    const headerFields: FieldSchema[] = [];
    const bodyFields: FieldSchema[] = [];

    allLabels.forEach(l => {
      if (tableHeaderRowIdx === -1 || l.r < tableHeaderRowIdx) {
        headerFields.push(l.field);
      } else {
        bodyFields.push(l.field);
      }
    });

    let sections: SectionSchema[] = [];
    const colMap: Record<string, string> = {};

    if (tableHeaderRowIdx !== -1) {
      const headers = fileData[tableHeaderRowIdx] || [];
      const columns: FieldSchema[] = headers.filter(h => !!h).map((h, idx) => {
        const colId = `col_${idx}`;
        const cellRefAtData = XLSX.utils.encode_cell({ r: tableHeaderRowIdx + 1, c: idx });
        const cell = firstSheet[cellRefAtData];
        
        const excelColLetter = XLSX.utils.encode_col(idx);
        colMap[`${excelColLetter}${tableHeaderRowIdx + 2}`] = colId;

        return {
          id: colId,
          label: String(h),
          inputType: cell?.f ? 'CALCULATED' : (typeof cell?.v === 'number' ? 'NUMERIC' : 'TEXT'),
          originalFormula: cell?.f ? `=${cell.f}` : undefined
        } as FieldSchema;
      });

      columns.forEach(col => {
        if (col.originalFormula) {
          col.formula = translateFormula(col.originalFormula, colMap);
        }
      });

      sections.push({
        id: `table_results`,
        title: 'Results Table',
        type: 'DATA_TABLE',
        orientation: 'ROWS_AS_RECORDS',
        columns
      });
    }

    if (bodyFields.length > 0) {
      sections.unshift({
        id: `parameters_body`,
        title: 'Test Parameters',
        type: 'SINGLE_VALUE',
        fields: bodyFields
      });
    }

    const newSchema: WorksheetSchema = {
      id: `imported_${Date.now()}`,
      metadata: { 
        title: 'Imported Worksheet Blueprint',
        standard: 'Deep scanned from Excel'
      },
      headerFields: headerFields.length > 0 ? headerFields : undefined,
      sections
    };

    setSchema(newSchema);
    setIsModalOpen(false);
    setFileData(null);
    setWorkbook(null);
    message.success('Deep scan complete! 100% of worksheet area was evaluated.');
  };

  return (
    <>
      <Button 
        type="primary"
        ghost
        icon={<ThunderboltOutlined />} 
        onClick={() => setIsModalOpen(true)}
        style={{ marginTop: 16, width: '100%', borderStyle: 'dashed' }}
      >
        Import from Excel
      </Button>

      <Modal
        title="Excel Worksheet Importer"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        footer={[
          <Button key="back" onClick={() => setIsModalOpen(false)}>Cancel</Button>,
          <Button key="submit" type="primary" disabled={!fileData} onClick={processImport}>
            Generate Blueprint
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Paragraph>
            Upload your existing Excel worksheet. We will attempt to infer the sections, table headers, and basic structure to help you build your digital method faster.
          </Paragraph>

          <Dragger 
            multiple={false} 
            beforeUpload={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1677ff' }} /></p>
            <p className="ant-upload-text">Click or drag Excel file to this area to parse</p>
            <p className="ant-upload-hint">Supports .xlsx, .xls and .csv formats</p>
          </Dragger>

          {fileData && (
            <Card size="small" title="Data Preview (First 5 Rows)" bodyStyle={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', maxHeight: 250 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fafafa', zIndex: 1 }}>
                    <tr>
                      {fileData[0]?.map((_, idx) => (
                        <th key={idx} style={{ border: '1px solid #f0f0f0', padding: '8px', fontSize: 11, textAlign: 'left', color: '#8c8c8c' }}>
                          Col {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ border: '1px solid #f0f0f0', padding: '8px', fontSize: 12 }}>
                            {String(cell || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Space>
      </Modal>
    </>
  );
};
