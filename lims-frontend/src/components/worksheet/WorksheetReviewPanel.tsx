import React, { useEffect, useState, useCallback } from 'react';
import { Card, Space, Spin, Empty, Alert, Button, message, Modal, Input, Typography, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined, SaveOutlined, UndoOutlined, LockOutlined } from '@ant-design/icons';
import { SectionRenderer } from '../../pages/worksheets/engine/SectionRenderer';
import { recomputeAllFormulas, runAllValidations, evaluateCondition } from '../../pages/worksheets/engine/FormulaEngine';
import { useEngineStore } from '../../pages/worksheets/engine/store';
import { WorksheetService } from '../../api/WorksheetService';
import type { WorksheetSchema } from '../../pages/methods/designer/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCanPerformAction } from '../../hooks/useCanPerformAction';

const { Text, Paragraph } = Typography;

interface WorksheetReviewPanelProps {
  sampleTestId: number;
  testStatus?: string;
  sampleStatus?: string;
}

export const WorksheetReviewPanel: React.FC<WorksheetReviewPanelProps> = ({ sampleTestId, testStatus, sampleStatus }) => {
  const queryClient = useQueryClient();
  const actions = useCanPerformAction(sampleStatus || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<WorksheetSchema | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
  const [specimens, setSpecimens] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: storeData, errors: storeErrors, initialize } = useEngineStore();

  const fetchWorksheet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await WorksheetService.getWorksheet(sampleTestId);
      const { schema: remoteSchema, data: remoteData, specimenStatuses: remoteSpecimens } = response.data;
      
      if (!remoteSchema) {
        setError('No worksheet schema found for this test.');
        return;
      }

      // Run calculations and validations once to get the final view
      const computedData = recomputeAllFormulas(remoteSchema, remoteData || {}, remoteSpecimens);
      const errors = runAllValidations(remoteSchema, computedData, remoteSpecimens);
      
      setSchema(remoteSchema);
      setData(computedData);
      setValidationErrors(errors);
      setSpecimens(remoteSpecimens || []);
      setError(null);

      // Initialize engine store with loaded data
      initialize(remoteSchema, remoteData || {}, remoteSpecimens);
    } catch (err) {
      setError('Failed to load worksheet data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sampleTestId, initialize]);

  useEffect(() => {
    fetchWorksheet();
  }, [fetchWorksheet, testStatus, sampleStatus]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin tip="Loading Worksheet..." />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon style={{ margin: '16px 0' }} />;
  }

  if (!schema) {
    return <Empty description="No worksheet found" />;
  }

  const handleFinalize = async () => {
    try {
      await WorksheetService.finalize(sampleTestId);
      message.success('Worksheet finalized successfully');
      queryClient.invalidateQueries();
    } catch (err) {
      message.error('Failed to finalize worksheet');
    }
  };

  const handleReject = async () => {
    try {
      await WorksheetService.rejectReview(sampleTestId);
      message.success('Worksheet rejected back to Analyst');
      queryClient.invalidateQueries();
    } catch (err) {
      message.error('Failed to reject worksheet');
    }
  };

  const handleCancelEdit = () => {
    fetchWorksheet();
    setIsEditing(false);
    setEditComment('');
  };

  const handleSaveReviewerEdit = async () => {
    try {
      setSaving(true);
      await WorksheetService.reviewerEdit(sampleTestId, storeData, editComment);
      message.success('Worksheet non-specimen changes saved successfully');
      setIsSaveModalVisible(false);
      setEditComment('');
      setIsEditing(false);
      queryClient.invalidateQueries();
      fetchWorksheet();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const canEditNonSpecimen = actions.canReview || ['UNDER_REVIEW', 'COMPLETED', 'INTERIM_AUTHORIZED'].includes(testStatus || '');

  const actionButtons = (
    <Space>
      {isEditing ? (
        <>
          <Button 
            icon={<UndoOutlined />} 
            onClick={handleCancelEdit}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={() => setIsSaveModalVisible(true)}
            loading={saving}
            style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
          >
            Save Changes
          </Button>
        </>
      ) : (
        <>
          {canEditNonSpecimen && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            >
              Edit Non-Specimen Fields
            </Button>
          )}
          {testStatus === 'UNDER_REVIEW' && actions.canReview && (
            <>
              <Button 
                danger
                icon={<CloseCircleOutlined />} 
                onClick={handleReject}
              >
                Reject to Analyst
              </Button>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={handleFinalize}
              >
                Finalize Worksheet Data
              </Button>
            </>
          )}
        </>
      )}
    </Space>
  );

  const activeData = isEditing ? storeData : data;
  const activeErrors = isEditing ? storeErrors : validationErrors;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {isEditing ? (
          <Alert 
            type="warning" 
            showIcon 
            message="Edit Mode Active: You can edit non-specimen fields. Specimen and test result sections remain locked." 
            style={{ flex: 1, marginRight: 16 }}
          />
        ) : <div />}
        <div>{actionButtons}</div>
      </div>

      {(schema.sections || []).map(section => {
        const isVisible = evaluateCondition({
          formula: section.visibilityCondition || '',
          schema,
          data: activeData,
          currentSectionId: section.id,
          currentRowIndex: null
        });

        if (!isVisible) return null;

        // Missing isSpecimenData treated as true (conservative)
        const isSpecimenSection = section.isSpecimenData !== false;
        const isSectionReadOnly = !isEditing || isSpecimenSection;

        return (
          <Card 
            key={section.id} 
            title={
              <Space>
                <span style={{ fontWeight: 600 }}>{section.title}</span>
                {isEditing && (
                  isSpecimenSection ? (
                    <Tag icon={<LockOutlined />} color="default">Locked (Specimen Data)</Tag>
                  ) : (
                    <Tag color="orange">Editable (Non-Specimen)</Tag>
                  )
                )}
              </Space>
            }
            styles={{ body: { padding: '16px' } }}
            headStyle={{ 
              backgroundColor: isEditing && !isSpecimenSection ? '#fff7e6' : '#fafafa', 
              minHeight: 40,
              borderBottom: isEditing && !isSpecimenSection ? '1px solid #ffd591' : undefined
            }}
            style={isEditing && !isSpecimenSection ? { border: '1px solid #ffa940' } : {}}
            size="small"
          >
            <SectionRenderer 
                section={section} 
                readOnly={isSectionReadOnly} 
                externalData={activeData} 
                externalSchema={schema}
                externalErrors={activeErrors}
                externalSpecimens={specimens}
            />
          </Card>
        );
      })}

      <Modal
        title="Save Worksheet Changes"
        open={isSaveModalVisible}
        onOk={handleSaveReviewerEdit}
        onCancel={() => setIsSaveModalVisible(false)}
        okText="Save & Log Revision"
        confirmLoading={saving}
      >
        <Paragraph>
          You are saving changes to non-specimen fields as a Reviewer/Authorizer. 
          A new revision will be logged in the audit trail.
        </Paragraph>
        <div style={{ marginTop: 12 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Audit Comment (Optional):</Text>
          <Input.TextArea
            rows={3}
            placeholder="Reason for modifying non-specimen fields..."
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
          />
        </div>
      </Modal>
    </Space>
  );
};
