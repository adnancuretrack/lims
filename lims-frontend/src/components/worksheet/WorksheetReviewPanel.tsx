import React, { useEffect, useState } from 'react';
import { Card, Space, Spin, Empty, Alert, Button, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { SectionRenderer } from '../../pages/worksheets/engine/SectionRenderer';
import { recomputeAllFormulas, runAllValidations, evaluateCondition } from '../../pages/worksheets/engine/FormulaEngine';
import { WorksheetService } from '../../api/WorksheetService';
import type { WorksheetSchema } from '../../pages/methods/designer/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCanPerformAction } from '../../hooks/useCanPerformAction';

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

  useEffect(() => {
    let isMounted = true;
    
    const fetchWorksheet = async () => {
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
        
        if (isMounted) {
          setSchema(remoteSchema);
          setData(computedData);
          setValidationErrors(errors);
          setSpecimens(remoteSpecimens || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
            setError('Failed to load worksheet data.');
            console.error(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWorksheet();
    return () => { isMounted = false; };
  }, [sampleTestId]);

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

  const actionButtons = (testStatus === 'UNDER_REVIEW' && actions.canReview) ? (
    <Space>
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
    </Space>
  ) : null;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {actionButtons && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          {actionButtons}
        </div>
      )}
      {(schema.sections || []).map(section => {
        const isVisible = evaluateCondition({
          formula: section.visibilityCondition || '',
          schema,
          data,
          currentSectionId: section.id,
          currentRowIndex: null
        });

        if (!isVisible) return null;

        return (
          <Card 
            key={section.id} 
            title={<span style={{ fontWeight: 600 }}>{section.title}</span>}
            styles={{ body: { padding: '16px' } }}
            headStyle={{ backgroundColor: '#fafafa', minHeight: 40 }}
            size="small"
          >
            <SectionRenderer 
                section={section} 
                readOnly={true} 
                externalData={data} 
                externalSchema={schema}
                externalErrors={validationErrors}
                externalSpecimens={specimens}
            />
          </Card>
        );
      })}
    </Space>
  );
};
