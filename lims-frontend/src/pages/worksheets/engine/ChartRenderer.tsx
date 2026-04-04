import React from 'react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Card, Empty } from 'antd';
import type { SectionSchema } from '../../methods/designer/types';
import { useEngineStore } from './store';

interface ChartRendererProps {
  section: SectionSchema;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ section }) => {
  const data = useEngineStore(state => state.data);
  const sourceData = (section.dataSourceSectionId ? data[section.dataSourceSectionId] : []) || [];
  
  const chartSeries = section.chartSeries?.[0]; // Support first series for now
  
  if (!section.dataSourceSectionId || !chartSeries || sourceData.length === 0) {
    return (
      <Card title={section.title || 'Chart'}>
        <Empty description="No data available for chart. Ensure the source table has values." />
      </Card>
    );
  }

  // Format data for Recharts, ensuring numerical values
  const formattedData = sourceData.map((row: any): { x: number; y: number } => ({
    x: parseFloat(row[chartSeries.xFieldId]),
    y: parseFloat(row[chartSeries.yFieldId])
  }))
  .filter((item: { x: number; y: number }) => !isNaN(item.x) && !isNaN(item.y))
  .sort((a: { x: number; y: number }, b: { x: number; y: number }) => a.x - b.x); // Sort for line continuity

  if (formattedData.length === 0) {
    return (
      <Card title={section.title || 'Chart'}>
        <Empty description="Waiting for numerical data coordinates..." />
      </Card>
    );
  }

  return (
    <Card title={section.title || 'Chart'} styles={{ body: { padding: '24px 12px' } }}>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          {section.chartType === 'LINE' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="x" 
                type="number" 
                domain={['auto', 'auto']}
                label={{ value: section.xAxisLabel, position: 'bottom', offset: 0 }} 
              />
              <YAxis 
                label={{ value: section.yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend verticalAlign="top" height={36}/>
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#1677ff" 
                name={chartSeries.name || 'Value'} 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={section.xAxisLabel} 
                domain={['auto', 'auto']}
                label={{ value: section.xAxisLabel, position: 'bottom', offset: 0 }} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={section.yAxisLabel} 
                label={{ value: section.yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend verticalAlign="top" height={36}/>
              <Scatter 
                data={formattedData} 
                fill="#1677ff" 
                name={chartSeries.name || 'Measurement'} 
              />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
