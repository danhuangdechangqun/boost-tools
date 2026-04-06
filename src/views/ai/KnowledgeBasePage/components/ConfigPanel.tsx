// RAG配置面板组件

import React from 'react';
import { Card, Form, InputNumber, Button, Divider } from 'antd';
import { RAGConfig } from '../types';

interface ConfigPanelProps {
  config: RAGConfig;
  onUpdate: (config: RAGConfig) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onUpdate }) => {
  const [form] = Form.useForm();

  const handleSave = () => {
    const values = form.getFieldsValue();
    onUpdate(values);
  };

  const handleReset = () => {
    const defaults = {
      chunkSize: 250,
      chunkOverlap: 50,
      bigChunkMaxSize: 800,
      topK: 3,
      scoreThreshold: 0.7
    };
    form.setFieldsValue(defaults);
    onUpdate(defaults);
  };

  return (
    <Card size="small" title="RAG配置" style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        size="small"
      >
        <Form.Item
          name="chunkSize"
          label="切片大小"
          tooltip="每个文本片段的最大字符数"
        >
          <InputNumber
            min={100}
            max={2000}
            step={100}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="bigChunkMaxSize"
          label="大片段最大值"
          tooltip="Big Chunk 最大字符数，超过此大小会再次切分"
        >
          <InputNumber
            min={400}
            max={2000}
            step={100}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="chunkOverlap"
          label="切片重叠"
          tooltip="相邻片段之间的重叠字符数"
        >
          <InputNumber
            min={0}
            max={200}
            step={10}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="topK"
          label="检索数量"
          tooltip="每次检索返回的最大片段数"
        >
          <InputNumber
            min={1}
            max={10}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="scoreThreshold"
          label="相似度阈值"
          tooltip="低于此阈值的片段将被过滤"
        >
          <InputNumber
            min={0}
            max={1}
            step={0.1}
            precision={1}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={handleSave} style={{ flex: 1 }}>
            保存配置
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default ConfigPanel;