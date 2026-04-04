// 可视化图表组件

import React from 'react';
import { Card, Empty, Row, Col } from 'antd';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { AnalysisResult } from '../types';

interface ChartViewProps {
  result: AnalysisResult | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const ChartView: React.FC<ChartViewProps> = ({ result }) => {
  if (!result) {
    return <Empty description="暂无数据" />;
  }

  const { reasonDistribution, businessDistribution, trendData } = result;

  // 故障原因分布数据
  const reasonData = Object.entries(reasonDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // 业务分布数据
  const businessData = Object.entries(businessDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  return (
    <Row gutter={[16, 16]}>
      {/* 故障原因分布 */}
      <Col span={12}>
        <Card size="small" title="故障原因分布 (TOP 10)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reasonData} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                {reasonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* 业务分布 */}
      <Col span={12}>
        <Card size="small" title="业务类型分布">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={businessData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {businessData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* 时间趋势 */}
      {trendData.length > 1 && (
        <Col span={24}>
          <Card size="small" title="时间趋势">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      )}
    </Row>
  );
};

export default ChartView;