import React, { useEffect, useState } from 'react';
import { Card, Typography, Space, Tooltip, Tabs, Spin, Empty, Button } from 'antd';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  AppstoreOutlined, 
  TableOutlined, 
  MenuOutlined,
  ToolOutlined,
  EditOutlined,
  FileTextOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  BookOutlined,
  PlusOutlined,
  BorderOutlined
} from '@ant-design/icons';
import { ExcelImporter } from './ExcelImporter';
import type { SectionType } from './types';
import axios from 'axios';

const { Title, Text } = Typography;

const SECTION_TYPES: { type: SectionType, label: string, icon: React.ReactNode, description: string }[] = [
  { type: 'SINGLE_VALUE', label: 'Flat Fields', icon: <AppstoreOutlined />, description: 'Standard layout for single inputs (metadata, config)' },
  { type: 'DATA_TABLE', label: 'Data Table', icon: <TableOutlined />, description: 'Standard worksheet table with rows or columns' },
  { type: 'GROUPED_TABLE', label: 'Grouped Table', icon: <MenuOutlined />, description: 'Table with repeating columns for tests like CBR' },
  { type: 'EQUIPMENT', label: 'Equipment', icon: <ToolOutlined />, description: 'Equipment registry block' },
  { type: 'SIGNATURE', label: 'Signatures', icon: <EditOutlined />, description: 'Signature block for authorization' },
  { type: 'NOTES', label: 'Notes', icon: <FileTextOutlined />, description: 'Read-only business rules or legends' },
  { type: 'REFERENCE_TABLE', label: 'Reference Table', icon: <UnorderedListOutlined />, description: 'Read-only threshold and spec tables' },
  { type: 'CHART', label: 'Chart', icon: <BarChartOutlined />, description: 'Visual data representation' },
  { type: 'MATRIX_TABLE', label: 'Matrix Table', icon: <BorderOutlined />, description: 'Fixed row and column headers (e.g., Approval Blocks)' },
];

// ... (DraggableSectionItem stays below)

const DraggableSectionItem = ({ type, label, icon, description, isTemplate, templateData }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: isTemplate ? `template-${label}` : `palette-${type}`,
    data: isTemplate ? 
      { ...templateData, isNew: true, paletteType: 'template' } : 
      { type, isNew: true, paletteType: 'block' },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    marginBottom: 8,
    border: isTemplate ? '1px solid #91caff' : '1px dashed #d9d9d9',
    backgroundColor: isTemplate ? '#e6f4ff' : '#fff'
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Tooltip placement="right" title={description}>
        <Card size="small" hoverable bodyStyle={{ padding: '8px 12px' }}>
          <Space>
            {icon || <BookOutlined />}
            <Text>{label}</Text>
          </Space>
        </Card>
      </Tooltip>
    </div>
  );
};

export const SectionPalette: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/admin/section-templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const items = [
    {
      key: 'blocks',
      label: 'Basic Blocks',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SECTION_TYPES.map(s => (
            <DraggableSectionItem key={s.type} {...s} />
          ))}
        </div>
      )
    },
    {
      key: 'library',
      label: 'Library',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? <Spin style={{ margin: '20px auto' }} /> : (
            templates.length > 0 ? templates.map(t => (
              <DraggableSectionItem 
                key={t.id} 
                label={t.name} 
                description={t.description} 
                isTemplate={true}
                templateData={t.schemaDefinition}
              />
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No templates saved" />
          )}
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            block 
            style={{ marginTop: 8 }}
            onClick={loadTemplates}
          >
            Refresh Library
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ width: 280, padding: 12, borderRight: '1px solid #f0f0f0', background: '#fafafa', overflowY: 'auto' }}>
      <Tabs defaultActiveKey="blocks" items={items} size="small" />

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
         <Title level={5} style={{ fontSize: 14 }}>Rapid Tools</Title>
         <ExcelImporter />
      </div>
    </div>
  );
};

