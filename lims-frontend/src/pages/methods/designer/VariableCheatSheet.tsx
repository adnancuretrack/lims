import React, { useState } from 'react';
import { Drawer, Input, List, Typography, Space, Button, message, Tooltip, Tag } from 'antd';
import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { WorksheetSchema } from './types';

const { Text } = Typography;

interface VariableCheatSheetProps {
  schema: WorksheetSchema;
  isOpen: boolean;
  onClose: () => void;
}

export const VariableCheatSheet: React.FC<VariableCheatSheetProps> = ({ schema, isOpen, onClose }) => {
  const [searchText, setSearchText] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${text} to clipboard!`);
  };

  const getPlaceholders = () => {
    const placeholders: { tag: string; label: string; sectionName: string; type: string; mapping?: string }[] = [];

    // Sections
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
      } else if (section.type === 'DATA_TABLE' || section.type === 'GROUPED_TABLE') {
        const columns = section.columns || section.dataColumns || [];
        
        if (section.orientation === 'COLUMNS_AS_TRIALS') {
           columns.forEach(col => {
             placeholders.push({
               tag: `{${section.id}.0.${col.id}}`,
               label: `${col.label} (Trial 1)`,
               sectionName,
               type: 'TABLE_COL'
             });
             placeholders.push({
               tag: `{${section.id}.AVG.${col.id}}`,
               label: `${col.label} (Average)`,
               sectionName,
               type: 'AGGREGATE'
             });
           });
        } else {
           // ROWS_AS_RECORDS
           columns.forEach(col => {
             placeholders.push({
               tag: `{${section.id}.0.${col.id}}`,
               label: `${col.label} (Row 1)`,
               sectionName,
               type: 'TABLE_ROW'
             });
           });
        }
      }
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
                    {item.type === 'TABLE_ROW' && <Tag style={{ marginLeft: 8 }}>Table Row</Tag>}
                    {item.type === 'TABLE_COL' && <Tag style={{ marginLeft: 8 }}>Table Col</Tag>}
                    {item.type === 'AGGREGATE' && <Tag style={{ marginLeft: 8 }} color="blue">Aggregate</Tag>}
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
      </Space>
    </Drawer>
  );
};
