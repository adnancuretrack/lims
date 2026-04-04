import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Button, Space, Divider } from 'antd';
import { DeleteOutlined, SettingOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { SectionSchema, FieldSchema } from './types';

const { Title, Text } = Typography;

const SortableField = ({ sectionId, field }: { sectionId: string, field: FieldSchema }) => {
  const { setSelectedField, removeField, selectedFieldId } = useDesignerStore();
  const isActive = selectedFieldId === field.id;

  return (
    <Card 
      size="small" 
      onClick={(e) => { 
        e.stopPropagation(); 
        console.log(`[Designer] Clicking Field: ${field.id}`);
        setSelectedField(field.id, sectionId); 
      }}
      style={{ 
        marginBottom: 8, 
        cursor: 'pointer', 
        border: isActive ? '2px solid #1677ff' : '1px solid #d9d9d9',
        backgroundColor: isActive ? '#e6f4ff' : '#fff',
        boxShadow: isActive ? '0 0 8px rgba(22,119,255,0.2)' : 'none'
      }}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text strong style={{ color: isActive ? '#1677ff' : 'inherit' }}>{field.label || 'Unnamed Field'}</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            [{field.inputType}] {field.formula && `(= ${field.formula})`}
          </Text>
        </div>
        <Button 
          type="text" 
          danger 
          size="small"
          icon={<DeleteOutlined />} 
          onClick={(e) => { e.stopPropagation(); removeField(sectionId, field.id); }} 
        />
      </div>
    </Card>
  );
};

const SortableSection = ({ section }: { section: SectionSchema }) => {
  const { 
    attributes, listeners, setNodeRef, transform, transition, isDragging 
  } = useSortable({ id: section.id });
  
  const { setSelectedSection, removeSection, addField, selectedSectionId, selectedFieldId } = useDesignerStore();

  const isSelected = selectedSectionId === section.id && !selectedFieldId;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: 16,
    cursor: 'default',
    border: isSelected ? '2px solid #1677ff' : '1px solid #f0f0f0',
    borderRadius: 8,
    backgroundColor: isSelected ? '#f0f7ff' : 'transparent'
  };

  const fields = section.fields || section.columns || section.dataColumns || [];

  return (
    <div ref={setNodeRef} style={style} onClick={() => {
        console.log(`[Designer] Clicking Section: ${section.id}`);
        setSelectedSection(section.id);
    }}>
      <Card 
        bodyStyle={{ padding: 16 }}
        headStyle={{ backgroundColor: isSelected ? '#e6f4ff' : '#f5f5f5' }}
        title={
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
            <MenuOutlined style={{ marginRight: 8, color: '#bfbfbf' }} />
            <span style={{ fontWeight: isSelected ? 600 : 400 }}>{section.title || section.type}</span>
            {section.orientation && <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>({section.orientation})</Text>}
          </div>
        }
        extra={
          <Space>
            <Button type="text" onClick={(e) => { e.stopPropagation(); setSelectedSection(section.id); }} icon={<SettingOutlined />} />
            <Button type="text" danger onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} icon={<DeleteOutlined />} />
          </Space>
        }
      >
        <div style={{ minHeight: 40, padding: 8, background: '#fafafa', borderRadius: 4, border: '1px dashed #d9d9d9' }}>
          {fields.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#bfbfbf', padding: '16px 0' }}>
              No fields added
            </div>
          ) : (
            fields.map(f => (
              <SortableField key={f.id} sectionId={section.id} field={f} />
            ))
          )}
          <Button 
            type="dashed" 
            block 
            icon={<PlusOutlined />} 
            onClick={(e) => { e.stopPropagation(); addField(section.id); }}
            style={{ marginTop: 8 }}
          >
            Add Field
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const DesignerCanvas: React.FC = () => {
  const { schema, selectedFieldId, setSelectedField, addHeaderField, removeHeaderField } = useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div 
      style={{ 
        flex: 1, 
        padding: 24, 
        background: isOver ? '#e6f4ff' : '#fff',
        overflowY: 'auto'
      }}
      ref={setNodeRef}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={4} style={{ marginBottom: 24 }}>Form Worksheet</Title>
        
        {/* Header Fields Section */}
        <Card 
          size="small" 
          title="Worksheet Metadata (Header Tags)" 
          style={{ marginBottom: 24, border: '1px solid #91caff', background: '#e6f4ff' }}
          extra={<Button type="link" size="small" icon={<PlusOutlined />} onClick={addHeaderField}>Add Header Field</Button>}
        >
          {(!schema.headerFields || schema.headerFields.length === 0) ? (
            <div style={{ padding: '12px 0', textAlign: 'center', color: '#8c8c8c', fontSize: 12 }}>
              No header fields defined (e.g. Sample Ref, Date)
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {schema.headerFields.map(f => {
                const isActive = selectedFieldId === f.id;
                return (
                  <Card 
                    key={f.id} 
                    size="small" 
                    hoverable
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      console.log(`[Designer] Clicking Header Field: ${f.id}`);
                      setSelectedField(f.id, null); 
                    }}
                    style={{ 
                      border: isActive ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      backgroundColor: isActive ? '#e6f4ff' : '#fff',
                      boxShadow: isActive ? '0 0 8px rgba(22,119,255,0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 13, color: isActive ? '#1677ff' : 'inherit' }}>{f.label}</Text>
                      <Button 
                        type="text" 
                        size="small" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={(e) => { e.stopPropagation(); removeHeaderField(f.id); }} 
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        <Divider>Worksheet Body Content</Divider>

        {schema.sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0', border: '2px dashed #d9d9d9', borderRadius: 8, color: '#bfbfbf' }}>
            <h2 style={{ color: '#bfbfbf' }}>Drag block templates here from the left palette</h2>
          </div>
        ) : (
          <SortableContext items={schema.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {schema.sections.map(section => (
              <SortableSection key={section.id} section={section} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
};
