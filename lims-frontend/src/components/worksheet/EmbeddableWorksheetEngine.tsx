import React, { useEffect, useState } from 'react';
import { Space, Card, message, Modal, Spin, Button } from 'antd';
import { SaveOutlined, CheckCircleOutlined, FileExcelOutlined, HistoryOutlined } from '@ant-design/icons';
import { useEngineStore } from '../../pages/worksheets/engine/store';
import { SectionRenderer } from '../../pages/worksheets/engine/SectionRenderer';
import { evaluateCondition, extractFinalResults } from '../../pages/worksheets/engine/FormulaEngine';
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
  const { schema, initialize, data, errors } = useEngineStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('DRAFT');
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadWorksheet = async () => {
      try {
        setLoading(true);
        const response = await WorksheetService.getWorksheet(sampleTestId);
        const { schema: remoteSchema, data: remoteData, status: remoteStatus } = response.data;
        
        if (isMounted) {
            setStatus(remoteStatus || 'DRAFT');
            
            // Priority: Local Storage (unsaved changes) > Remote Data (last saved draft)
            const localSaved = localStorage.getItem(`lims_worksheet_${sampleTestId}_draft`);
            const initialData = (localSaved && remoteStatus === 'DRAFT') ? JSON.parse(localSaved) : remoteData;
            
            initialize(remoteSchema, initialData);
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
      content: 'Submitting will lock the data and push the calculated results downstream. This action cannot be undone.',
      onOk: async () => {
        try {
          const finalResults = extractFinalResults(schema!, data);
          
          await WorksheetService.submit(sampleTestId, {
            data,
            calculatedResults: data, // Our engine merges calculated values into the main data map
            finalResults
          });

          localStorage.removeItem(`lims_worksheet_${sampleTestId}_draft`);
          message.success('Worksheet locked and submitted.');
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

  const isActuallyReadOnly = readOnly || status !== 'DRAFT';

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
          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>Finalize</Button>
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
                <SectionRenderer section={section} />
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
