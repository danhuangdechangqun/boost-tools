import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Form, message, Spin, Select, Switch } from 'antd';
import { ArrowLeft, Save, Server } from 'lucide-react';
import { getConfig, setConfig, testLlmConnection, AppConfig } from '@/services/api';

interface SettingsPageProps {
  onBack: () => void;
}

// 预设供应商配置
const PROVIDER_PRESETS = [
  { name: '自定义', baseUrl: '', model: '' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/anthropic', model: 'glm-5' },
  { name: '智谱 GLM (国际)', baseUrl: 'https://api.z.ai/api/anthropic', model: 'glm-5' },
  { name: '阿里百炼', baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic', model: '' },
  { name: '阿里百炼 (Coding)', baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic', model: '' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/anthropic', model: 'deepseek-chat' },
  { name: 'Moonshot Kimi', baseUrl: 'https://api.moonshot.cn/anthropic', model: 'moonshot-v1-8k' },
  { name: '硅基流动', baseUrl: 'https://api.siliconflow.cn', model: 'Qwen/Qwen2.5-7B-Instruct' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api', model: 'anthropic/claude-sonnet-4-6' },
  { name: 'Anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      form.setFieldsValue({
        llm: {
          apiUrl: config.llm?.apiUrl || '',
          apiKey: config.llm?.apiKey || '',
          model: config.llm?.model || '',
          format: config.llm?.format || 'claude'
        },
        shortcut: {
          key: config.shortcut?.key || 'Ctrl+Shift+B',
          enabled: config.shortcut?.enabled ?? true
        },
        weeklyReport: {
          enabled: config.weeklyReport?.enabled ?? false,
          time: config.weeklyReport?.time || '17:00',
          format: config.weeklyReport?.format || 'markdown'
        }
      });
    } catch (e) {
      message.error('加载配置失败');
    }
    setLoading(false);
  };

  const handleSave = async (values: any) => {
    const config: AppConfig = {
      llm: {
        apiUrl: values.llm?.apiUrl || '',
        apiKey: values.llm?.apiKey || '',
        model: values.llm?.model || '',
        format: values.llm?.format || 'claude'
      },
      shortcut: {
        key: values.shortcut?.key || 'Ctrl+Shift+B',
        enabled: values.shortcut?.enabled ?? true
      },
      weeklyReport: {
        enabled: values.weeklyReport?.enabled ?? false,
        time: values.weeklyReport?.time || '17:00',
        format: values.weeklyReport?.format || 'markdown'
      }
    };
    await setConfig(config);
    message.success('保存成功');
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.name === presetName);
    if (preset && preset.baseUrl) {
      form.setFieldsValue({
        llm: {
          apiUrl: preset.baseUrl,
          model: preset.model,
        }
      });
    }
  };

  const testConnection = async () => {
    const values = form.getFieldsValue();
    const apiUrl = values.llm?.apiUrl;
    const apiKey = values.llm?.apiKey;
    const model = values.llm?.model;

    if (!apiUrl || !apiKey || !model) {
      message.error('请先填写完整的API配置（地址、密钥、模型）');
      return;
    }

    setTesting(true);
    try {
      const config: AppConfig = {
        llm: {
          apiUrl: apiUrl,
          apiKey: apiKey,
          model: model,
          format: values.llm?.format || 'claude'
        },
        shortcut: {
          key: values.shortcut?.key || 'Ctrl+Shift+B',
          enabled: values.shortcut?.enabled ?? true
        },
        weeklyReport: {
          enabled: values.weeklyReport?.enabled ?? false,
          time: values.weeklyReport?.time || '17:00',
          format: values.weeklyReport?.format || 'markdown'
        }
      };
      await setConfig(config);

      const result = await testLlmConnection();
      if (result.success) {
        message.success('连接成功！');
      } else {
        message.error(result.error || '连接失败');
      }
    } catch (e: any) {
      message.error(e?.message || '连接失败');
    }
    setTesting(false);
  };

  if (loading) {
    return <Spin style={{ margin: 100 }} />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>设置</h3>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: 'auto', maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Card title="大模型API配置" style={{ marginBottom: 16 }}>
            <Form.Item label="快速选择供应商">
              <Select
                placeholder="选择预设供应商自动填充配置"
                onChange={handlePresetChange}
                allowClear
              >
                {PROVIDER_PRESETS.map(p => (
                  <Select.Option key={p.name} value={p.name}>{p.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name={['llm', 'apiUrl']} label="API地址" rules={[{ required: true, message: '请输入API地址' }]}>
              <Input placeholder="如: https://api.anthropic.com" />
            </Form.Item>
            <Form.Item name={['llm', 'apiKey']} label="API Key" rules={[{ required: true, message: '请输入API Key' }]}>
              <Input.Password placeholder="输入您的API密钥" />
            </Form.Item>
            <Form.Item name={['llm', 'model']} label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
              <Input placeholder="如: claude-sonnet-4-6, glm-5" />
            </Form.Item>
            <Form.Item name={['llm', 'format']} label="API格式" initialValue="claude">
              <Select>
                <Select.Option value="claude">Anthropic Messages (原生)</Select.Option>
                <Select.Option value="openai">OpenAI Chat Completions</Select.Option>
              </Select>
            </Form.Item>
            <Button icon={<Server size={14} />} onClick={testConnection} loading={testing} style={{ marginRight: 8 }}>测试连接</Button>
            <span style={{ fontSize: 12, color: '#6B7280' }}>测试前会自动保存配置</span>
          </Card>

          <Card title="快捷键设置" style={{ marginBottom: 16 }}>
            <Form.Item name={['shortcut', 'key']} label="全局快捷键">
              <Input placeholder="如: Ctrl+Shift+B" />
            </Form.Item>
            <Form.Item name={['shortcut', 'enabled']} label="启用快捷键" valuePropName="checked">
              <Switch />
            </Form.Item>
            <p style={{ fontSize: 12, color: '#6B7280' }}>设置快捷键后可快速唤起应用窗口</p>
          </Card>

          <Card title="周报设置" style={{ marginBottom: 16 }}>
            <Form.Item name={['weeklyReport', 'enabled']} label="自动生成周报" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name={['weeklyReport', 'time']} label="生成时间">
              <Input type="time" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name={['weeklyReport', 'format']} label="周报格式">
              <Select style={{ width: 200 }}>
                <Select.Option value="markdown">Markdown</Select.Option>
                <Select.Option value="text">纯文本</Select.Option>
              </Select>
            </Form.Item>
          </Card>

          <Button type="primary" htmlType="submit" icon={<Save size={14} />} size="large">保存设置</Button>
        </Form>
      </div>
    </div>
  );
};

export default SettingsPage;