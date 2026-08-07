import React, { useState, useRef } from 'react';
import { Drawer, Input, List, Typography, Space, Button, message, Tooltip, Tag } from 'antd';
import { CopyOutlined, InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import type { WorksheetSchema } from './types';

const { Text } = Typography;

interface VariableCheatSheetProps {
  schema: WorksheetSchema;
  isOpen: boolean;
  onClose: () => void;
}

export const VariableCheatSheet: React.FC<VariableCheatSheetProps> = ({ schema, isOpen, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `COA_Variables_${schema.metadata?.code || 'Draft'}`
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${text} to clipboard!`);
  };

  const getPlaceholders = () => {
    const placeholders: { tag: string; label: string; sectionName: string; type: string; mapping?: string }[] = [];

    schema.sections.forEach(section => {
      const sectionName = section.title || section.id;

      if (section.type === 'SINGLE_VALUE') {
        section.fields?.forEach(f => {
          placeholders.push({
            tag: `{${section.id}.${f.id}}`,
            label: f.label,
            sectionName,
            type: 'SINGLE'
          });
        });
      } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE' || section.type === 'MATRIX_TABLE') {
        placeholders.push({
          tag: `{table:${section.id}}`,
          label: `Full Dynamic Table (${sectionName})`,
          sectionName,
          type: 'FULL_TABLE'
        });
        
        placeholders.push({
          tag: `{count:${section.id}}`,
          label: `Total row count`,
          sectionName,
          type: 'COUNT'
        });

        if (section.type === 'MATRIX_TABLE') {
          const rowHeaders = section.rowHeaders || [];
          const columns = section.columns || [];
          
          rowHeaders.forEach(rh => {
            columns.forEach(col => {
              placeholders.push({
                tag: `{${section.id}.${col.id}.${rh.id}}`,
                label: `${rh.label} - ${col.label}`,
                sectionName,
                type: 'MATRIX_CELL'
              });
            });
          });
        } else {
          // DATA_TABLE or GROUPED_TABLE
          const cols = section.columns || section.dataColumns || [];
          cols.forEach(col => {
            placeholders.push({
              tag: `{${section.id}.${col.id}.N}`,
              label: `${col.label} (Replace N with row index 0, 1, 2...)`,
              sectionName,
              type: 'TABLE_CELL'
            });
          });
        }
      }
    });

    if (schema.computedVariables) {
      schema.computedVariables.forEach(cv => {
        placeholders.push({
          tag: `{calc:${cv.id}}`,
          label: cv.label,
          sectionName: 'Computed Variables',
          type: 'COMPUTED'
        });
      });
    }

    placeholders.push({
      tag: '{qr:coa}',
      label: 'Digital COA QR Code (links to Dashboard)',
      sectionName: 'System / QR Code',
      type: 'QR_CODE'
    });

    return placeholders.filter(p => 
      p.label.toLowerCase().includes(searchText.toLowerCase()) || 
      p.tag.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const placeholders = getPlaceholders();

  return (
    <Drawer
      title="Variable Cheat Sheet (COA Tags)"
      placement="right"
      width={450}
      onClose={onClose}
      open={isOpen}
      extra={
        <Space>
           <Tooltip title="Print Cheat Sheet">
             <Button type="text" icon={<PrinterOutlined />} onClick={() => handlePrint()} />
           </Tooltip>
           <Tooltip title="Use these tags in your Excel COA templates to inject live worksheet data.">
             <InfoCircleOutlined style={{ color: '#1677ff' }} />
           </Tooltip>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ backgroundColor: '#e6f4ff', padding: '12px', borderRadius: '8px', border: '1px solid #91caff' }}>
           <Text style={{ fontSize: 13 }}>
             Paste these tags into your <strong>Excel COA Template</strong>. The system will replace them with the actual values during PDF generation.
           </Text>
        </div>

        <Input.Search 
          placeholder="Search fields or tags..." 
          allowClear
          onChange={e => setSearchText(e.target.value)}
        />

        <div ref={contentRef} style={{ padding: '0 8px' }} className="printable-cheat-sheet">
          <style type="text/css" media="print">
            {`
              @page { size: A4 portrait; margin: 15mm; }
              .print-only-title { display: block !important; margin-bottom: 20px; font-size: 20px; text-align: center; }
              .printable-cheat-sheet ul {
                column-count: 2;
                column-gap: 24px;
                padding: 0;
              }
              .printable-cheat-sheet li {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 12px;
                border: 1px solid #f0f0f0;
                padding: 12px !important;
                border-radius: 6px;
              }
              .printable-cheat-sheet button { display: none !important; }
            `}
          </style>
          <h2 style={{ display: 'none' }} className="print-only-title">Variable Cheat Sheet</h2>
          <List
            itemLayout="vertical"
            dataSource={placeholders}
            renderItem={item => (
              <List.Item
                key={item.tag}
                style={{ padding: '12px 8px', borderRadius: '4px', borderBottom: '1px solid #f0f0f0' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      {item.sectionName} 
                      {item.type === 'FULL_TABLE' && <Tag style={{ marginLeft: 8 }} color="purple">Full Dynamic Table</Tag>}
                      {item.type === 'TABLE_CELL' && <Tag style={{ marginLeft: 8 }} color="blue">Table Cell</Tag>}
                      {item.type === 'MATRIX_CELL' && <Tag style={{ marginLeft: 8 }} color="cyan">Matrix Cell</Tag>}
                      {item.type === 'COUNT' && <Tag style={{ marginLeft: 8 }} color="green">Count</Tag>}
                      {item.type === 'COMPUTED' && <Tag style={{ marginLeft: 8 }} color="gold">Computed</Tag>}
                      {item.type === 'QR_CODE' && <Tag style={{ marginLeft: 8 }} color="volcano">QR Code</Tag>}
                      {item.mapping && (
                        <Tag style={{ marginLeft: 8 }} color="cyan">Mapped: {item.mapping}</Tag>
                      )}
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>{item.label}</div>
                    <div 
                      style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontFamily: 'monospace',
                        color: '#c41d7f',
                        fontSize: 14,
                        display: 'inline-block'
                      }}
                    >
                      {item.tag}
                    </div>
                  </div>
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />} 
                    onClick={() => copyToClipboard(item.tag)}
                  />
                </div>
              </List.Item>
            )}
          />
        </div>
      </Space>
    </Drawer>
  );
};
