import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, Space, Card, Typography, message, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined, FileExcelOutlined, HistoryOutlined } from '@ant-design/icons';
import { useEngineStore } from './store';
import { SectionRenderer } from './SectionRenderer';
import { evaluateCondition, extractFinalResults } from './FormulaEngine';
import { WorksheetService } from '../../../api/WorksheetService';
import { WorksheetAuditDrawer } from './WorksheetAuditDrawer';
import { HeaderRenderer } from './HeaderRenderer';

const { Header, Content } = Layout;
const { Text } = Typography;

export const WorksheetEnginePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schema, initialize, data, errors } = useEngineStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('DRAFT');
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const loadWorksheet = async () => {
      try {
        setLoading(true);
        const response = await WorksheetService.getWorksheet(id!);
        const { schema: remoteSchema, data: remoteData, status: remoteStatus } = response.data;
        
        setStatus(remoteStatus || 'DRAFT');
        
        // Priority: Local Storage (unsaved changes) > Remote Data (last saved draft)
        const localSaved = localStorage.getItem(`lims_worksheet_${id}_draft`);
        const initialData = (localSaved && remoteStatus === 'DRAFT') ? JSON.parse(localSaved) : remoteData;
        
        initialize(remoteSchema, initialData);
      } catch (err) {
        message.error('Failed to load worksheet context');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) loadWorksheet();
  }, [id, initialize]);

  // ... (auto-save effect) ...
  useEffect(() => {
    if (status === 'DRAFT' && Object.keys(data).length > 0) {
      const handler = setTimeout(() => {
        localStorage.setItem(`lims_worksheet_${id}_draft`, JSON.stringify(data));
      }, 1500); 
      return () => clearTimeout(handler);
    }
  }, [data, id, status]);

  const handleSave = async () => {
    try {
      await WorksheetService.saveDraft(id!, data);
      localStorage.setItem(`lims_worksheet_${id}_draft`, JSON.stringify(data));
      message.success('Worksheet progress saved to server');
    } catch (err) {
      message.error('Failed to sync with server.');
    }
  };

  const handleDownloadReport = () => {
     // Use window.open or a hidden anchor to trigger the download from our new endpoint
     window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/worksheet/${id}/report`, '_blank');
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
          
          await WorksheetService.submit(id!, {
            data,
            calculatedResults: data, // Our engine merges calculated values into the main data map
            finalResults
          });

          localStorage.removeItem(`lims_worksheet_${id}_draft`);
          message.success('Worksheet locked and submitted.');
          navigate('/analysis'); // Redirect to Result Entry queue
        } catch (err) {
          message.error('Submission failed. Check your connection and try again.');
        }
      }
    });
  };

  if (loading || !schema) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <Spin size="large" tip="Initializing Worksheet Engine..." />
      </div>
    );
  }

  const isReadOnly = status !== 'DRAFT';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis')} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{schema.metadata?.title || 'Method Worksheet'}</h2>
            <Space size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>{schema.metadata?.standard || 'LIMS Standard'}</Text>
                <div style={{ padding: '0 8px', borderRadius: 10, fontSize: 10, color: '#fff', background: status === 'DRAFT' ? '#1677ff' : '#52c41a', textTransform: 'uppercase' }}>
                    {status}
                </div>
            </Space>
          </div>
        </Space>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => setAuditOpen(true)}>History</Button>
          {isReadOnly && (
             <Button icon={<FileExcelOutlined />} onClick={handleDownloadReport} type="default">
                Download PDF Report
             </Button>
          )}
          {!isReadOnly && (
            <>
              <Button icon={<SaveOutlined />} onClick={handleSave}>Save Draft</Button>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>Finalize Submission</Button>
            </>
          )}
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <HeaderRenderer />
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {schema.sections.map(section => {
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
                headStyle={{ backgroundColor: '#fafafa', minHeight: 48 }}
              >
                <SectionRenderer section={section} />
              </Card>
            );
          })}
          
          {schema.sections.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              No sections defined in the selected schema.
            </div>
          )}
        </Space>
      </Content>
      <WorksheetAuditDrawer 
        sampleTestId={id!} 
        isOpen={auditOpen} 
        onClose={() => setAuditOpen(false)} 
      />
    </Layout>
  );
};

export default WorksheetEnginePage;
