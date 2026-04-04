import React from 'react';
import { Drawer, Timeline, Typography, Tag, Card, Spin } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { WorksheetService } from '../../../api/WorksheetService';

const { Text } = Typography;

interface AuditDrawerProps {
  sampleTestId: string | number;
  isOpen: boolean;
  onClose: () => void;
}

export const WorksheetAuditDrawer: React.FC<AuditDrawerProps> = ({ sampleTestId, isOpen, onClose }) => {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const loadHistory = async () => {
        try {
          setLoading(true);
          const response = await WorksheetService.getHistory(sampleTestId);
          setHistory(response.data);
        } catch (err) {
          console.error('Failed to load history', err);
        } finally {
          setLoading(false);
        }
      };
      loadHistory();
    }
  }, [isOpen, sampleTestId]);

  return (
    <Drawer
      title="Worksheet Revision History"
      placement="right"
      width={400}
      open={isOpen}
      onClose={onClose}
      extra={<HistoryOutlined />}
    >
      {loading ? (
        <Spin tip="Loading revisions..." />
      ) : (
        <Timeline
          items={history.map((rev, idx) => ({
            children: (
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Rev #{rev.revision?.id || idx + 1}</Text>
                  <Tag color={rev.status === 'SUBMITTED' ? 'green' : 'blue'}>{rev.status}</Tag>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                  Changed at: {new Date(rev.revision?.timestamp).toLocaleString()} 
                </div>
                {/* We could show a diff here, but for now we just show it exists */}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Captured Snapshot of {Object.keys(rev.data || {}).length} sections.
                </Text>
              </Card>
            ),
          }))}
        />
      )}
      {history.length === 0 && !loading && (
        <div style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>
           No revision history found yet.
        </div>
      )}
    </Drawer>
  );
};
