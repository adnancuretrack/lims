import React, { useRef } from 'react';
import { Input, Typography, Space, Collapse, Tag, Tooltip } from 'antd';
import { useDesignerStore } from './store';

const { Text } = Typography;

interface FormulaBuilderProps {
  value?: string;
  onChange: (value: string) => void;
  currentSectionId?: string | null;
}

const FUNCTION_GROUPS = [
  {
    title: 'Current Batch (Active Specimens)',
    color: 'orange',
    items: [
      { name: 'SUM_CURRENT', desc: 'Sum of values in current active batch' },
      { name: 'AVG_CURRENT', desc: 'Average of values in current active batch' },
      { name: 'COUNT_CURRENT', desc: 'Count of specimens in current active batch' },
      { name: 'MIN_CURRENT', desc: 'Minimum of current active batch' },
      { name: 'MAX_CURRENT', desc: 'Maximum of current active batch' },
      { name: 'STDEV_CURRENT', desc: 'Sample standard deviation (N-1) of current active batch' },
      { name: 'CV_CURRENT', desc: 'Coefficient of variation (%) of current active batch' },
    ]
  },
  {
    title: 'Cumulative (All Specimens / Rows)',
    color: 'blue',
    items: [
      { name: 'SUM_ALL', desc: 'Sum across all specimens/rows' },
      { name: 'AVG_ALL', desc: 'Average across all specimens/rows' },
      { name: 'COUNT_ALL', desc: 'Count of all non-empty specimens/rows' },
      { name: 'MIN_ALL', desc: 'Minimum across all specimens/rows' },
      { name: 'MAX_ALL', desc: 'Maximum across all specimens/rows' },
      { name: 'STDEV_ALL', desc: 'Sample standard deviation (N-1) across all specimens/rows' },
      { name: 'CV_ALL', desc: 'Coefficient of variation (%) across all specimens/rows' },
      { name: 'MEDIAN_ALL', desc: 'Median across all specimens/rows' },
      { name: 'SUM_RUNNING', desc: 'Running sum up to current row' },
    ]
  },
  {
    title: 'Math & Helpers',
    color: 'green',
    items: [
      { name: 'ABS', desc: 'Absolute value' },
      { name: 'ROUND', desc: 'Round to nearest integer or decimals' },
      { name: 'HOURS_BETWEEN', desc: 'Hours between two datetime fields' },
    ]
  }
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
        rows={4}
        style={{ fontFamily: 'monospace', fontWeight: 500, backgroundColor: '#faf2f2' }}
        placeholder="e.g. {wetMass} - {dryMass}"
      />
      
      <Collapse size="small" ghost>
        <Collapse.Panel header={<Text type="secondary" style={{ fontSize: 12 }}>Available Fields (Click to insert)</Text>} key="1">
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {availableVars.map(v => (
              <Tooltip title={`From: ${v.sectionTitle} • ID: ${v.id}`} key={v.id}>
                <Tag 
                  color="blue" 
                  style={{ cursor: 'pointer', margin: 0, fontFamily: 'monospace' }} 
                  onClick={() => insertText(`{${v.id}}`)}
                >
                  {v.label}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </Collapse.Panel>

        {FUNCTION_GROUPS.map((group, groupIdx) => (
          <Collapse.Panel header={<Text type="secondary" style={{ fontSize: 12 }}>{group.title} (Click to insert)</Text>} key={String(groupIdx + 2)}>
            <Space size={[4, 4]} wrap>
              {group.items.map(fn => (
                <Tooltip title={fn.desc} key={fn.name}>
                  <Tag 
                    color={group.color} 
                    style={{ cursor: 'pointer', margin: 0, fontFamily: 'monospace' }} 
                    onClick={() => insertText(`${fn.name}()`)}
                  >
                    {fn.name}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </Collapse.Panel>
        ))}
      </Collapse>
    </div>
  );
};
