import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Layout, Button, Space, message, Modal, Tag, Typography, Upload } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, RocketOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import { useDesignerStore } from './store';
import { SectionPalette } from './SectionPalette';
import { DesignerCanvas } from './DesignerCanvas';
import { PropertyEditor } from './PropertyEditor';
import { WorksheetPreview } from './WorksheetPreview';
import { VariableCheatSheet } from './VariableCheatSheet';
import type { SectionType } from './types';
import { LookupService } from '../../../api/LookupService';
import { MethodDefinitionService } from '../../../api/MethodDefinitionService';
import { useAuthStore } from '../../../store/authStore';

const { Header, Content } = Layout;

export const MethodDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new' || !id;
  
  const { addSection, reorderSections, schema, setSchema, reset } = useDesignerStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [postPublishModalOpen, setPostPublishModalOpen] = useState(false);
  const [targetPublishId, setTargetPublishId] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  // Reset store on mount if it's a new method
  useEffect(() => {
    if (isNew) {
      reset();
    } else if (id) {
      loadExistingMethod(id);
    }
  }, [id, isNew]);

  const loadExistingMethod = async (methodId: string) => {
    try {
      const activeDef = await MethodDefinitionService.getActiveDefinition(methodId);
      if (activeDef && activeDef.schemaDefinition) {
        setSchema(activeDef.schemaDefinition as any);
      }
    } catch (err) {
      console.error('Failed to load existing method definition', err);
    }
  };


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const isNewBlock = active.data.current?.isNew;
    const paletteType = active.data.current?.paletteType;

    if (isNewBlock) {
      if (paletteType === 'block') {
        const sectionType = active.data.current?.type as SectionType;
        addSection(sectionType);
      }
    } else if (active.id !== over.id) {
      const oldIndex = schema.sections.findIndex(s => s.id === active.id);
      const newIndex = schema.sections.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderSections(oldIndex, newIndex);
      }
    }
  };

  const publishSchema = () => {
    if (isNew && (!schema.metadata?.name || !schema.metadata?.code)) {
      message.warning('Please provide Method Code and Name at the top of the canvas before publishing.');
      return;
    }

    Modal.confirm({
      title: isNew ? 'Create & Publish Method?' : 'Publish New Version?',
      icon: <RocketOutlined style={{ color: '#1677ff' }} />,
      content: 'Once published, this worksheet will be available for live testing. This action will commit the blueprint to the database.',
      okText: 'Publish Now',
      okType: 'primary',
      async onOk() {
        setIsPublishing(true);
        try {
          let targetId = id;
          
          // 1. Create the Test Method record if it's new
          if (isNew) {
            const newMethod = await LookupService.createTestMethod({
              name: schema.metadata?.name || schema.metadata?.title || 'Unnamed',
              code: schema.metadata?.code || 'TEMP-CODE',
              standardRef: schema.metadata?.standardRef || schema.metadata?.standard || '',
              resultType: (schema.metadata as any)?.resultType || 'QUANTITATIVE',
              decimalPlaces: (schema.metadata as any)?.decimalPlaces || 2,
              active: true,
              tatHours: 24,
              hasWorksheet: true
            } as any);
            targetId = String(newMethod.id);
          }

          // 2. Save the Schema as a Draft first (Backend logic)
          await MethodDefinitionService.saveDraft(targetId!, {
            schemaDefinition: schema
          });

          // 3. Publish (Move from DRAFT to PUBLISHED)
          // Note: Using userId 1 as placeholder for current admin
          await MethodDefinitionService.publish(targetId!, 1);

          message.success('Method Published Successfully!');
          if (isNew) {
            setTargetPublishId(targetId!);
            setPostPublishModalOpen(true);
          } else {
            navigate('/test-methods');
          }
        } catch (err) {
          console.error('Publishing failed', err);
          message.error('Failed to publish method. Check server logs.');
        } finally {
          setIsPublishing(false);
        }
      },
    });
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/test-methods')} />
          <h2 style={{ margin: 0 }}>
            {isNew ? 'New Method Designer' : `Edit Method: ${schema.metadata?.title || ''}`}
          </h2>
          <Tag color={isNew ? 'blue' : 'green'}>{isNew ? 'New' : 'v1.0 Active'}</Tag>
        </Space>
        <Space split={<div style={{ width: 1, height: 16, backgroundColor: '#f0f0f0' }} />}>
          <Button type="link" onClick={() => setCheatSheetOpen(true)}>Variables</Button>
          <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
          <Button icon={<SaveOutlined />} disabled={isPublishing}>Save Draft</Button>
          <Button type="primary" onClick={publishSchema} loading={isPublishing}>Publish</Button>
        </Space>
      </Header>
      <Content style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SectionPalette />
          <DesignerCanvas />
          <PropertyEditor />
          <DragOverlay>
            {activeId ? (
              <div style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                Dragging Block...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Content>

      <Modal
        title="Next Step: Upload COA Template"
        open={postPublishModalOpen}
        footer={[
           <Button key="skip" onClick={() => navigate('/test-methods')}>Skip for now</Button>,
           <Button key="complete" type="primary" onClick={() => navigate('/test-methods')}>Complete</Button>
        ]}
        closable={false}
        maskClosable={false}
      >
        <Typography.Paragraph>
          Method Published successfully! As a final step, please upload your COA Excel Template.
        </Typography.Paragraph>
        <Upload 
            name="file" 
            action={`/api/v1/test-methods/${targetPublishId}/definitions/template`}
            headers={{ Authorization: `Bearer ${useAuthStore.getState().token}` }}
            showUploadList={false}
            onChange={(info) => {
                if (info.file.status === 'uploading') {
                    setIsUploadingTemplate(true);
                } else if (info.file.status === 'done') {
                    setIsUploadingTemplate(false);
                    message.success('COA Template uploaded successfully. You can complete the setup.');
                } else if (info.file.status === 'error') {
                    setIsUploadingTemplate(false);
                    const errMsg = info.file.response?.message || 'Server error';
                    message.error(`Upload failed: ${errMsg}`);
                }
            }}
        >
            <Button icon={<UploadOutlined />} block loading={isUploadingTemplate}>Upload Template</Button>
        </Upload>
      </Modal>

      <WorksheetPreview 
        schema={schema} 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
      />

      <VariableCheatSheet 
        schema={schema}
        isOpen={cheatSheetOpen}
        onClose={() => setCheatSheetOpen(false)}
      />
    </Layout>
  );
};

export default MethodDesignerPage;
