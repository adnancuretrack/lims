import React, { useState } from 'react';
import { Modal, Button, Input, Select, Space, List } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDesignerStore } from './store';
import type { ColumnGroupSchema, FieldSchema } from './types';

interface ColumnGroupEditorProps {
  sectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ColumnGroupEditor: React.FC<ColumnGroupEditorProps> = ({ sectionId, isOpen, onClose }) => {
  const { schema, updateSection } = useDesignerStore();
  const section = schema.sections.find(s => s.id === sectionId);
  const fields = section?.columns || section?.dataColumns || section?.fields || [];
  
  // Local state for editing to avoid spamming the store until saved
  const [localGroups, setLocalGroups] = useState<ColumnGroupSchema[]>(section?.columnGroups || []);

  const handleAddGroup = () => {
    const newGroup: ColumnGroupSchema = {
      id: `group_${crypto.randomUUID().substring(0,6)}`,
      label: 'New Super Header',
      span: [],
    };
    setLocalGroups([...localGroups, newGroup]);
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<ColumnGroupSchema>) => {
    setLocalGroups(localGroups.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const handleRemoveGroup = (groupId: string) => {
    setLocalGroups(localGroups.filter(g => g.id !== groupId));
  };

  const handleSave = () => {
    updateSection(sectionId, { columnGroups: localGroups });
    onClose();
  };

  return (
    <Modal
      title="Table Header Grouper"
      open={isOpen}
      onOk={handleSave}
      onCancel={onClose}
      width={600}
      okText="Save Header Hierarchy"
    >
      <div style={{ marginBottom: 16 }}>
        Build super-headers to visually group columns together (e.g., "Planeness Check" spans over "Top" and "Bottom").
      </div>
      
      <List
        dataSource={localGroups}
        renderItem={(group) => (
          <List.Item
            actions={[
              <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveGroup(group.id as string)} />
            ]}
          >
            <div style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input 
                  value={group.label} 
                  onChange={e => handleUpdateGroup(group.id as string, { label: e.target.value })} 
                  placeholder="Header Label"
                  style={{ fontWeight: 500 }}
                />
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Select columns under this header"
                  value={group.span}
                  onChange={(val) => handleUpdateGroup(group.id as string, { span: val })}
                  options={fields.map((f: FieldSchema) => ({ label: f.label || 'Unnamed', value: f.id }))}
                />
              </Space>
            </div>
          </List.Item>
        )}
      />
      
      <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddGroup} style={{ marginTop: 16 }}>
        Add Super Header
      </Button>
    </Modal>
  );
};
