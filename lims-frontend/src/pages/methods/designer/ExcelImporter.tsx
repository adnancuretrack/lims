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
  const { schema, setSchema } = useDesignerStore();

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

  const isCellEmpty = (val: any) => {
    if (val === undefined || val === null) return true;
    const str = String(val).trim();
    if (str === '') return true;
    if (/^_+$/.test(str)) return true; // Matches "____" placeholders
    return false;
  };

  const cleanLabel = (val: string) => {
    let label = val.trim();
    if (label.endsWith(':') || label.endsWith('.') || label.endsWith('-')) {
      label = label.slice(0, -1).trim();
    }
    if (label.startsWith('{{') && label.endsWith('}}')) {
      label = label.slice(2, -2).trim();
    }
    // Remove extra whitespace
    return label.replace(/\s+/g, ' ');
  };

  const createField = (label: string, r: number, c: number, firstSheet: XLSX.WorkSheet, isTableCol = false) => {
    const clean = cleanLabel(label) || `Field_${r}_${c}`;
    const cellRef = XLSX.utils.encode_cell({ r, c: isTableCol ? c : c + 1 });
    const cell = firstSheet[cellRef]; 
    const dataCellRef = XLSX.utils.encode_cell({ r: isTableCol ? r + 1 : r, c: isTableCol ? c : c + 1 });
    const dataCell = firstSheet[dataCellRef];

    const typeCell = dataCell || cell;

    return {
      id: `${clean.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).slice(2, 5)}`,
      label: clean.charAt(0).toUpperCase() + clean.slice(1).replace(/_/g, ' '),
      inputType: typeCell?.f ? 'CALCULATED' : (typeof typeCell?.v === 'number' ? 'NUMERIC' : 'TEXT'),
      originalFormula: typeCell?.f ? `=${typeCell.f}` : undefined,
    } as FieldSchema;
  };

  const processImport = () => {
    if (!fileData || !workbook) return;

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = fileData.length;
    let sections: SectionSchema[] = [];
    const headerFields: FieldSchema[] = [];
    const footerFields: FieldSchema[] = [];

    // Map to keep track of cells already consumed by tables
    const cellUsed = Array(rows).fill(null).map(() => [] as boolean[]);

    // 1. Detect Horizontal Tables (ROWS_AS_RECORDS)
    // Heuristic: A row has 3+ text cells. The row immediately below has empty cells in those same columns.
    for (let r = 0; r < rows - 1; r++) {
      let consecutiveTexts = 0;
      let startCol = -1;
      let cols: { c: number, label: string }[] = [];

      for (let c = 0; c < (fileData[r]?.length || 0); c++) {
        if (!isCellEmpty(fileData[r][c]) && !cellUsed[r]?.[c]) {
          if (startCol === -1) startCol = c;
          consecutiveTexts++;
          cols.push({ c, label: String(fileData[r][c]) });
        } else {
          // Break the sequence
          if (consecutiveTexts >= 3) {
             let emptyBelow = 0;
             for (let i = 0; i < cols.length; i++) {
               if (isCellEmpty(fileData[r + 1]?.[cols[i].c])) emptyBelow++;
             }
             if (emptyBelow >= Math.floor(cols.length / 2)) {
                // Table found!
                const columns = cols.map(col => createField(col.label, r, col.c, firstSheet, true));
                sections.push({
                   id: `table_horiz_${r}`,
                   title: `Data Table (Row ${r+1})`,
                   type: 'DATA_TABLE',
                   orientation: 'ROWS_AS_RECORDS',
                   columns
                });
                
                // Mark cells as used
                for(let i = r; i < r + 2; i++) {
                   for(let j = startCol; j <= cols[cols.length-1].c; j++) {
                      if (!cellUsed[i]) cellUsed[i] = [];
                      cellUsed[i][j] = true;
                   }
                }
             }
          }
          startCol = -1;
          consecutiveTexts = 0;
          cols = [];
        }
      }
      
      // End of row check
      if (consecutiveTexts >= 3) {
         let emptyBelow = 0;
         for (let i = 0; i < cols.length; i++) {
           if (isCellEmpty(fileData[r + 1]?.[cols[i].c])) emptyBelow++;
         }
         if (emptyBelow >= Math.floor(cols.length / 2)) {
            const columns = cols.map(col => createField(col.label, r, col.c, firstSheet, true));
            sections.push({
               id: `table_horiz_${r}`,
               title: `Data Table (Row ${r+1})`,
               type: 'DATA_TABLE',
               orientation: 'ROWS_AS_RECORDS',
               columns
            });
            for(let i = r; i < r + 2; i++) {
               for(let j = startCol; j <= cols[cols.length-1].c; j++) {
                  if (!cellUsed[i]) cellUsed[i] = [];
                  cellUsed[i][j] = true;
               }
            }
         }
      }
    }

    // 2. Detect Vertical Tables (COLUMNS_AS_TRIALS)
    // Heuristic: Col 0 or 1 has 3+ vertical text cells. The column to its right has empty cells.
    for (let c = 0; c < 2; c++) {
      let r = 0;
      while (r < rows) {
        if (!isCellEmpty(fileData[r]?.[c]) && !cellUsed[r]?.[c]) {
           let startRow = r;
           let consecutiveVals = [];
           while (r < rows && !isCellEmpty(fileData[r]?.[c]) && !cellUsed[r]?.[c]) {
              // Check if right cell is empty
              let rightCellEmpty = false;
              for(let scanC = c + 1; scanC <= c + 3; scanC++) {
                 if (isCellEmpty(fileData[r]?.[scanC])) {
                    rightCellEmpty = true;
                    break;
                 }
              }
              if (rightCellEmpty) {
                 consecutiveVals.push({ r, label: String(fileData[r][c]) });
              } else {
                 break;
              }
              r++;
           }
           
           if (consecutiveVals.length >= 3) {
              // Table found!
              const columns = consecutiveVals.map(val => createField(val.label, val.r, c, firstSheet, false));
              sections.push({
                 id: `table_vert_${startRow}`,
                 title: `Property Table (Row ${startRow+1})`,
                 type: 'DATA_TABLE',
                 orientation: 'COLUMNS_AS_TRIALS',
                 trialCount: 3,
                 columns
              });
              
              // Mark used
              for(let i = startRow; i < r; i++) {
                 for(let j = c; j < c + 4; j++) { 
                    if (!cellUsed[i]) cellUsed[i] = [];
                    cellUsed[i][j] = true;
                 }
              }
           }
        }
        r++;
      }
    }

    // 3. Extract Single Fields (Proximity Heuristic)
    let firstTableIdx = rows;
    for(let r=0; r<rows; r++) {
       if (cellUsed[r]?.some(v => v)) {
          firstTableIdx = Math.min(firstTableIdx, r);
       }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (fileData[r]?.length || 0); c++) {
        if (cellUsed[r]?.[c]) continue;
        
        let val = fileData[r][c];
        if (!isCellEmpty(val)) {
           let strVal = String(val).trim();
           // Remove extra whitespace like lines to write on
           if (/^__+$/.test(strVal)) continue;

           // Is it a label? Check right or below
           let rightEmpty = isCellEmpty(fileData[r]?.[c+1]);
           let belowEmpty = (r + 1 < rows) ? isCellEmpty(fileData[r+1]?.[c]) : false;
           
           // Added proximity heuristic
           if (strVal.endsWith(':') || strVal.startsWith('{{') || rightEmpty || belowEmpty) {
              const field = createField(strVal, r, c, firstSheet, false);
              if (r < firstTableIdx || sections.length === 0) {
                 headerFields.push(field);
              } else {
                 footerFields.push(field);
              }
              if (!cellUsed[r]) cellUsed[r] = [];
              cellUsed[r][c] = true;
              if (rightEmpty) cellUsed[r][c+1] = true;
           }
        }
      }
    }

    // Assembly
    const finalSections: SectionSchema[] = [];
    if (headerFields.length > 0) {
       finalSections.push({
          id: `parameters_body`,
          title: 'Test Parameters',
          type: 'SINGLE_VALUE',
          fields: headerFields
       });
    }
    finalSections.push(...sections);
    if (footerFields.length > 0) {
       finalSections.push({
          id: `footer_body`,
          title: 'Additional Information',
          type: 'SINGLE_VALUE',
          fields: footerFields
       });
    }

    const newSchema: WorksheetSchema = {
      ...schema,
      sections: finalSections
    };

    setSchema(newSchema);
    setIsModalOpen(false);
    setFileData(null);
    setWorkbook(null);
    message.success('Smart scan complete! Structural heuristics applied.');
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
