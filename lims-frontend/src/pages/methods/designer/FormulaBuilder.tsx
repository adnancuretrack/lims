import React, { useRef } from 'react';
import { Input, Typography, Space, Collapse, Tag, Tooltip } from 'antd';
import { useDesignerStore } from './store';

const { Text } = Typography;

interface FormulaBuilderProps {
  value?: string;
  onChange: (value: string) => void;
  currentSectionId?: string | null;
}

const FUNCTIONS = [
  { name: 'SUM_RUNNING', desc: 'Cumulative sum up to current row' },
  { name: 'SUM_ALL', desc: 'Total across all rows' },
  { name: 'AVG_ALL', desc: 'Average across all rows' },
  { name: 'COUNT_ALL', desc: 'Count of non-empty values' },
  { name: 'MIN_ALL', desc: 'Minimum across all rows' },
  { name: 'MAX_ALL', desc: 'Maximum across all rows' },
  { name: 'HOURS_BETWEEN', desc: 'Hours between two datetime fields' },
  { name: 'ABS', desc: 'Absolute value' },
];

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({ value, onChange, currentSectionId }) => {
  const { schema } = useDesignerStore();
  const inputRef = useRef<any>(null);

  // Collect all available fields across the schema to use as variables
  const availableVars: { id: string, label: string, sectionTitle: string }[] = [];
  
  schema.sections.forEach(sec => {
    const pushFields = (fields: any[] | undefined) => {
      if (fields) {
        fields.forEach(f => {
          // If in the same section, we can use concise notation {fieldId}
          // If in another section, we use {sectionId.fieldId} for clarity/safety, though the engine might support global uniqueness
          const varName = sec.id === currentSectionId ? f.id : `${sec.id}.${f.id}`;
          availableVars.push({ id: varName, label: f.label || f.id, sectionTitle: sec.title || 'Untitled Section' });
        });
      }
    };
    pushFields(sec.fields);
    pushFields(sec.columns);
    pushFields(sec.dataColumns);
  });

  const insertText = (textToInsert: string) => {
    const currentVal = value || '';
    
    // We append to the end for simplicity in this V1 builder
    // A more advanced V2 would track cursor position using selectionStart via inputRef
    const newVal = currentVal + (currentVal.endsWith(' ') || currentVal === '' ? '' : ' ') + textToInsert;
    onChange(newVal);
    
    // Attempt to focus back
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Input.TextArea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ fontFamily: 'monospace', fontWeight: 500, backgroundColor: '#faf2f2' }}
        placeholder="e.g. {wetMass} - {dryMass}"
      />
      
      <Collapse size="small" ghost>
        <Collapse.Panel header={<Text type="secondary" style={{ fontSize: 12 }}>Available Fields (Click to insert)</Text>} key="1">
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {availableVars.map(v => (
              <Tooltip title={`From: ${v.sectionTitle}`} key={v.id}>
                <Tag 
                  color="blue" 
                  style={{ cursor: 'pointer', margin: 0, fontFamily: 'monospace' }} 
                  onClick={() => insertText(`{${v.id}}`)}
                >
                  {v.id}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </Collapse.Panel>

        <Collapse.Panel header={<Text type="secondary" style={{ fontSize: 12 }}>Functions (Click to insert)</Text>} key="2">
          <Space size={[4, 4]} wrap>
            {FUNCTIONS.map(fn => (
              <Tooltip title={fn.desc} key={fn.name}>
                <Tag 
                  color="green" 
                  style={{ cursor: 'pointer', margin: 0, fontFamily: 'monospace' }} 
                  onClick={() => insertText(`${fn.name}()`)}
                >
                  {fn.name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};
