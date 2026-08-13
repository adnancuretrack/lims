import React, { useEffect, useState } from 'react';
import { Space, Card, message, Modal, Spin, Button } from 'antd';
import { SaveOutlined, CheckCircleOutlined, FileExcelOutlined, HistoryOutlined } from '@ant-design/icons';
import { useEngineStore } from '../../pages/worksheets/engine/store';
import { SectionRenderer } from '../../pages/worksheets/engine/SectionRenderer';
import { evaluateCondition } from '../../pages/worksheets/engine/FormulaEngine';
import { WorksheetService } from '../../api/WorksheetService';
import { WorksheetAuditDrawer } from '../../pages/worksheets/engine/WorksheetAuditDrawer';

interface EmbeddableWorksheetEngineProps {
  sampleTestId: number;
  readOnly?: boolean;
  onSubmitSuccess?: () => void;
}

export const EmbeddableWorksheetEngine: React.FC<EmbeddableWorksheetEngineProps> = ({ 
  sampleTestId, 
  readOnly = false,
  onSubmitSuccess 
}) => {
  const { schema, initialize, data, errors, specimenStatuses } = useEngineStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('DRAFT');
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadWorksheet = async () => {
      try {
        setLoading(true);
        const response = await WorksheetService.getWorksheet(sampleTestId);
        const { schema: remoteSchema, data: remoteData, status: remoteStatus, specimenStatuses: remoteSpecimens } = response.data;
        
        if (isMounted) {
            setStatus(remoteStatus || 'DRAFT');
            
            // Priority: Local Storage (unsaved changes) > Remote Data (last saved draft)
            const localSaved = localStorage.getItem(`lims_worksheet_${sampleTestId}_draft`);
            const initialData = (localSaved && remoteStatus === 'DRAFT') ? JSON.parse(localSaved) : remoteData;
            
            initialize(remoteSchema, initialData, remoteSpecimens);
        }
      } catch (err) {
        if (isMounted) {
            message.error('Failed to load worksheet context');
            console.error(err);
        }
      } finally {
        if (isMounted) {
            setLoading(false);
        }
      }
    };
    
    if (sampleTestId) loadWorksheet();
    return () => { isMounted = false; };
  }, [sampleTestId, initialize]);

  // Auto-save effect
  useEffect(() => {
    if (status === 'DRAFT' && Object.keys(data).length > 0) {
      const handler = setTimeout(() => {
        localStorage.setItem(`lims_worksheet_${sampleTestId}_draft`, JSON.stringify(data));
      }, 1500); 
      return () => clearTimeout(handler);
    }
  }, [data, sampleTestId, status]);

  const handleSave = async () => {
    try {
      await WorksheetService.saveDraft(sampleTestId, data);
      localStorage.setItem(`lims_worksheet_${sampleTestId}_draft`, JSON.stringify(data));
      message.success('Worksheet progress saved to server');
    } catch (err) {
      message.error('Failed to sync with server.');
    }
  };

  const handleDownloadReport = () => {
     window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/worksheet/${sampleTestId}/report`, '_blank');
  };

  const handleComplete = () => {
    // Validation check before submit
    const hasErrors = Object.values(errors).some(err => err.severity === 'ERROR');
    if (hasErrors) {
      Modal.error({
        title: 'Validation Failed',
        content: 'Please resolve all highlighted errors before submitting the worksheet.'
      });
      return;
    }

    Modal.confirm({
      title: 'Submit Worksheet For Review?',
      content: 'Submitting will lock the data and push it for finalization by a Reviewer. This action cannot be undone.',
      onOk: async () => {
        try {
          await WorksheetService.submit(sampleTestId, {
            data,
            calculatedResults: data // Our engine merges calculated values into the main data map
          });

          localStorage.removeItem(`lims_worksheet_${sampleTestId}_draft`);
          message.success('Worksheet locked and submitted for review.');
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
        } catch (err) {
          message.error('Submission failed. Check your connection and try again.');
        }
      }
    });
  };

  const handleSubmitSpecimens = (isFinal: boolean) => {
    const hasErrors = Object.values(errors).some(err => err.severity === 'ERROR');
    if (hasErrors) {
      Modal.error({
        title: 'Validation Failed',
        content: 'Please resolve all highlighted errors before submitting the worksheet.'
      });
      return;
    }

    Modal.confirm({
      title: isFinal ? 'Submit Specimens for Review?' : 'Submit for Interim Authorization?',
      content: isFinal 
        ? 'This will lock all data and push the calculated results for finalization by a Reviewer. You will not be able to add more specimens.'
        : 'This will lock the current batch of specimen results and send them for review. You can still add more specimens later.',
      onOk: async () => {
        try {
          const specimenIndices: number[] = [];
          const specSection = schema?.sections?.find(s => s.hasMultiDaySpecimen);
          if (specSection) {
            const tableData = data[specSection.id] || [];
            tableData.forEach((_: any, idx: number) => {
              const specStatus = specimenStatuses?.[idx]?.status;
              if (specStatus !== 'AUTHORIZED') {
                specimenIndices.push(idx);
              }
            });
          }
          
          if (specimenIndices.length === 0) {
             message.warning('No new specimens to submit');
             return;
          }

          if (isFinal) {
            await WorksheetService.submitFinal(sampleTestId, {
              specimenIndices,
              data,
              calculatedResults: data
            });
          } else {
            await WorksheetService.submitInterim(sampleTestId, {
              specimenIndices,
              data,
              calculatedResults: data
            });
          }

          localStorage.removeItem(`lims_worksheet_${sampleTestId}_draft`);
          message.success(isFinal ? 'Worksheet submitted for final authorization.' : 'Worksheet submitted for interim authorization.');
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
        } catch (err) {
          message.error('Submission failed. Check your connection and try again.');
        }
      }
    });
  };

  if (loading || !schema) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin tip="Initializing Worksheet Engine..." />
      </div>
    );
  }

  const isActuallyReadOnly = readOnly || !['DRAFT', 'IN_PROGRESS', 'INTERIM_AUTHORIZED'].includes(status);
  const hasMultiDaySpecimen = schema?.sections?.some(s => s.hasMultiDaySpecimen);

  const actionButtons = (
    <Space>
      <Button size="small" icon={<HistoryOutlined />} onClick={() => setAuditOpen(true)}>History</Button>
      {isActuallyReadOnly ? (
         <Button size="small" icon={<FileExcelOutlined />} onClick={handleDownloadReport} type="default">
            Download Report
         </Button>
      ) : (
        <>
          <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>Save Draft</Button>
          {hasMultiDaySpecimen ? (
            <>
              <Button 
                size="small" 
                type="primary" 
                ghost
                icon={<CheckCircleOutlined />} 
                onClick={() => handleSubmitSpecimens(false)}
              >
                Submit Interim
              </Button>
              <Button 
                size="small" 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={() => handleSubmitSpecimens(true)}
              >
                Submit Specimens for Review
              </Button>
            </>
          ) : (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>Submit for Review</Button>
          )}
        </>
      )}
    </Space>
  );

  return (
    <Card 
        title={`${schema.metadata?.title || 'Method Worksheet'} (${schema.metadata?.standard || 'LIMS Standard'})`}
        extra={actionButtons}
        size="small"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '16px' } }}
    >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
                <SectionRenderer section={section} readOnly={isActuallyReadOnly} />
              </Card>
            );
          })}
          
          {(!schema.sections || schema.sections.length === 0) && (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              No sections defined in the selected schema.
            </div>
          )}
        </Space>
        
        <WorksheetAuditDrawer 
            sampleTestId={sampleTestId.toString()} 
            isOpen={auditOpen} 
            onClose={() => setAuditOpen(false)} 
        />
    </Card>
  );
};
