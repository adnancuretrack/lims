import React, { useRef } from 'react';
import { Input, Typography, Space, Collapse, Tag, Tooltip } from 'antd';
import { useDesignerStore } from './store';

const { Text } = Typography;

interface ConditionBuilderProps {
  value?: string;
  onChange: (value: string) => void;
  currentSectionId?: string | null;
}

const OPERATORS = [
  { name: '==', desc: 'Equals' },
  { name: '!=', desc: 'Not Equals' },
  { name: '>', desc: 'Greater Than' },
  { name: '<', desc: 'Less Than' },
  { name: '>=', desc: 'Greater or Equal' },
  { name: '<=', desc: 'Less or Equal' },
  { name: 'AND', desc: 'Logical AND' },
  { name: 'OR', desc: 'Logical OR' },
  { name: 'CONTAINS()', desc: 'Check if text contains value' },
];

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ value, onChange, currentSectionId }) => {
  const { schema } = useDesignerStore();
  const inputRef = useRef<any>(null);

  const availableVars: { id: string, label: string, sectionTitle: string }[] = [];
  
  schema.sections.forEach(sec => {
    const pushFields = (fields: any[] | undefined) => {
      if (fields) {
        fields.forEach(f => {
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
    const newVal = currentVal + (currentVal.endsWith(' ') || currentVal === '' ? '' : ' ') + textToInsert;
    onChange(newVal);
    
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
        rows={3}
        style={{ fontFamily: 'monospace', fontWeight: 500, backgroundColor: '#fdfaeb' }}
        placeholder="e.g. {samplePrep.moistPrep} == 'YES'"
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

        <Collapse.Panel header={<Text type="secondary" style={{ fontSize: 12 }}>Logical Operators</Text>} key="2">
          <Space size={[4, 4]} wrap>
            {OPERATORS.map(op => (
              <Tooltip title={op.desc} key={op.name}>
                <Tag 
                  color="warning" 
                  style={{ cursor: 'pointer', margin: 0, fontFamily: 'monospace' }} 
                  onClick={() => insertText(op.name)}
                >
                  {op.name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};
