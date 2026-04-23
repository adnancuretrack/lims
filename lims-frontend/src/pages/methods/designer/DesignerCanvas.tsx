import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Button, Space, Input, Form, Row, Col, Tag } from 'antd';
import { DeleteOutlined, SettingOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { SectionSchema, FieldSchema } from './types';
import { horizontalListSortingStrategy } from '@dnd-kit/sortable';

const { Title, Text } = Typography;

const SortableField = ({ sectionId, field, isCompact }: { sectionId: string, field: FieldSchema, isCompact?: boolean }) => {
  const { setSelectedField, removeField, selectedFieldId } = useDesignerStore();
  const isActive = selectedFieldId === field.id;

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ 
    id: field.id,
    data: {
      type: 'field',
      sectionId,
      field
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    marginBottom: isCompact ? 0 : 8,
    cursor: 'pointer',
    border: isActive ? '2px solid #1677ff' : '1px solid #d9d9d9',
    backgroundColor: isActive ? '#e6f4ff' : '#fff',
    boxShadow: isActive ? '0 0 8px rgba(22,119,255,0.2)' : 'none',
    zIndex: isDragging ? 10 : 1,
    padding: isCompact ? '4px 8px' : 0,
    borderRadius: isCompact ? 4 : 8
  };

  if (isCompact) {
    return (
        <div ref={setNodeRef} style={style} onClick={(e) => { 
            e.stopPropagation(); 
            setSelectedField(field.id, sectionId); 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', maxWidth: 'calc(100% - 20px)' }}>
                   <MenuOutlined {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: 4, color: '#bfbfbf', fontSize: 10 }} />
                   <Text strong ellipsis style={{ fontSize: 12, color: isActive ? '#1677ff' : 'inherit' }}>{field.label || 'Field'}</Text>
                </div>
                {field.systemMapping && <Text style={{ fontSize: 10 }}>⚡</Text>}
            </div>
        </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} onClick={(e) => { 
        e.stopPropagation(); 
        setSelectedField(field.id, sectionId); 
    }}>
      <Card size="small" bodyStyle={{ padding: '8px 12px' }} hoverable>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MenuOutlined {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: 12, color: '#bfbfbf' }} />
            <div>
              <Text strong style={{ color: isActive ? '#1677ff' : 'inherit' }}>{field.label || 'Unnamed Field'}</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, display: 'block' }}>
                [{field.inputType}] {field.formula && `(= ${field.formula})`}
              </Text>
            </div>
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
    </div>
  );
};

const SortableSection = ({ section }: { section: SectionSchema }) => {
  const { 
    attributes, listeners, setNodeRef, transform, transition, isDragging 
  } = useSortable({ 
    id: section.id,
    data: {
        type: 'section',
        section
    }
  });
  
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
    <div ref={setNodeRef} style={style} onClick={(e) => {
        e.stopPropagation();
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
          {section.type === 'MATRIX_TABLE' ? (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                    <th style={{ border: '1px solid #d9d9d9', padding: '4px 8px', background: '#f5f5f5', width: 120, fontSize: 11, textAlign: 'left' }}>
                        Row \ Column
                    </th>
                    <SortableContext items={fields.map(f => f.id)} strategy={horizontalListSortingStrategy}>
                        {fields.map(f => (
                            <th key={f.id} style={{ border: '1px solid #d9d9d9', padding: 4, minWidth: 100, backgroundColor: '#fff' }}>
                                <SortableField sectionId={section.id} field={f} isCompact />
                            </th>
                        ))}
                    </SortableContext>
                    </tr>
                </thead>
                <tbody>
                    {(section.rowHeaders && section.rowHeaders.length > 0 ? section.rowHeaders : [{ id: 'p1', label: 'New Row' }]).map((rh) => (
                    <tr key={rh.id}>
                        <td style={{ border: '1px solid #d9d9d9', padding: '6px 8px', fontSize: 12, fontWeight: 500, backgroundColor: '#fff' }}>
                            {rh.label}
                            {rh.systemMapping && <span style={{ marginLeft: 4, fontSize: 10 }}>⚡</span>}
                        </td>
                        {fields.map(f => (
                        <td key={f.id} style={{ border: '1px solid #d9d9d9', padding: '6px 8px', textAlign: 'center', backgroundColor: '#fdfdfd' }}>
                            <Tag style={{ fontSize: 9, margin: 0 }}>{f.inputType}</Tag>
                        </td>
                        ))}
                    </tr>
                    ))}
                </tbody>
                </table>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                        type="dashed" 
                        size="small"
                        icon={<PlusOutlined />} 
                        onClick={(e) => { e.stopPropagation(); addField(section.id); }}
                        style={{ flex: 1 }}
                    >
                        Add Column
                    </Button>
                    <Button 
                        type="dashed" 
                        size="small"
                        icon={<PlusOutlined />} 
                        onClick={(e) => { e.stopPropagation(); useDesignerStore.getState().addRowHeader(section.id); }}
                        style={{ flex: 1 }}
                    >
                        Add Row
                    </Button>
                </div>
            </div>
          ) : (
            <>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#bfbfbf', padding: '16px 0' }}>
                        No fields added
                    </div>
                    ) : (
                    fields.map(f => (
                        <SortableField key={f.id} sectionId={section.id} field={f} />
                    ))
                    )}
                </SortableContext>
                <Button 
                    type="dashed" 
                    block 
                    icon={<PlusOutlined />} 
                    onClick={(e) => { e.stopPropagation(); addField(section.id); }}
                    style={{ marginTop: 8 }}
                >
                    Add Field
                </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export const DesignerCanvas: React.FC = () => {
    const { schema, setSelectedSection, setMetadata } = useDesignerStore();
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div 
      style={{ 
        flex: 1, 
        padding: 24, 
        background: isOver ? '#e6f4ff' : '#fff',
        overflowY: 'auto',
        cursor: 'default'
      }}
      ref={setNodeRef}
      onClick={() => {
        setSelectedSection(null);
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={4} style={{ marginBottom: 24 }}>Form Worksheet</Title>

        <Card size="small" style={{ marginBottom: 24, padding: 12, background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label={<Typography.Text strong>Method Code (Unique)</Typography.Text>} required style={{ marginBottom: 12 }}>
                  <Input 
                    value={schema.metadata?.code as string || ''} 
                    onChange={e => setMetadata({ code: e.target.value })} 
                    placeholder="e.g. ASTM-C39" 
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item label={<Typography.Text strong>Method Name</Typography.Text>} required style={{ marginBottom: 12 }}>
                  <Input 
                    value={schema.metadata?.name as string || schema.metadata?.title || ''} 
                    onChange={e => setMetadata({ title: e.target.value, name: e.target.value })} 
                    placeholder="e.g. Compressive Strength" 
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label={<Typography.Text strong>Standard Reference</Typography.Text>} style={{ marginBottom: 0 }}>
                  <Input 
                    value={schema.metadata?.standardRef as string || schema.metadata?.standard || ''} 
                    onChange={e => setMetadata({ standardRef: e.target.value, standard: e.target.value })} 
                    placeholder="e.g. ASTM C39 / C39M" 
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
        

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
