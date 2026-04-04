import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Form, message, Spin, Select, Switch } from 'antd';
import { ArrowLeft, Save, Server, FileText } from 'lucide-react';
import { getConfig, setConfig, testLlmConnection, AppConfig } from '@/services/api';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

// 预设供应商配置
const PROVIDER_PRESETS = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', format: 'openai' as const },
];

// 键盘按键映射
const KEY_MAP: Record<string, string> = {
  'Control': 'Ctrl',
  'Ctrl': 'Ctrl',
  'Meta': 'Cmd',
  'Command': 'Cmd',
  'Shift': 'Shift',
  'Alt': 'Alt',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
};

// 修饰键列表（使用统一的键名）
const MODIFIER_KEYS = ['Ctrl', 'Cmd', 'Shift', 'Alt'];

// Tauri invoke 辅助函数
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;

const getTauriInvoke = async () => {
  if (!tauriInvoke) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      tauriInvoke = invoke;
    } catch {
      // 非 Tauri 环境
    }
  }
  return tauriInvoke;
};

// 暂停全局快捷键
const pauseGlobalShortcut = async () => {
  const invoke = await getTauriInvoke();
  if (invoke) {
    try {
      await invoke('pause_global_shortcut');
    } catch (e) {
      console.warn('暂停快捷键失败:', e);
    }
  }
};

// 恢复全局快捷键
const resumeGlobalShortcut = async () => {
  const invoke = await getTauriInvoke();
  if (invoke) {
    try {
      await invoke('resume_global_shortcut');
    } catch (e) {
      console.warn('恢复快捷键失败:', e);
    }
  }
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [recordingKey, setRecordingKey] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const keyInputRef = useRef<HTMLInputElement>(null);
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
          format: config.llm?.format || 'openai'
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
        format: values.llm?.format || 'openai'
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
    if (preset) {
      form.setFieldsValue({
        llm: {
          apiUrl: preset.baseUrl || '',
          model: preset.model || '',
          format: preset.format || 'openai'
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
      message.warning('请先填写完整的API配置后再测试连接');
      return;
    }

    setTesting(true);
    try {
      const config: AppConfig = {
        llm: {
          apiUrl: apiUrl,
          apiKey: apiKey,
          model: model,
          format: values.llm?.format || 'openai'
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

  const startRecording = async () => {
    // 暂停全局快捷键，避免录制时触发执行
    await pauseGlobalShortcut();
    setRecordingKey(true);
    setRecordedKeys([]);
    if (keyInputRef.current) {
      keyInputRef.current.focus();
    }
  };

  const stopRecording = async () => {
    setRecordingKey(false);
    // 恢复全局快捷键
    await resumeGlobalShortcut();
    if (recordedKeys.length > 0) {
      const shortcutStr = recordedKeys.join('+');
      form.setFieldsValue({ shortcut: { key: shortcutStr } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recordingKey) return;
    e.preventDefault();
    e.stopPropagation();

    const mappedKey = KEY_MAP[e.key] || e.key.toUpperCase();
    // 使用映射后的键名判断是否是修饰键
    const isModifier = MODIFIER_KEYS.includes(mappedKey);

    // 如果是普通字母键（不是修饰键），则完成录制
    if (!isModifier) {
      // 根据当前按下的修饰键组合最终快捷键
      const keys = new Set<string>();
      if (e.ctrlKey) keys.add('Ctrl');
      if (e.metaKey) keys.add('Cmd');
      if (e.shiftKey) keys.add('Shift');
      if (e.altKey) keys.add('Alt');
      keys.add(mappedKey);

      const finalKeys = Array.from(keys);
      setRecordedKeys(finalKeys);
      setRecordingKey(false);
      form.setFieldsValue({ shortcut: { key: finalKeys.join('+') } });
      // 恢复全局快捷键
      resumeGlobalShortcut();
    }
    // 修饰键按下时不做任何更新，避免重复触发
  };

  
  if (loading) {
    return <Spin style={{ margin: 100 }} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>设置</h3>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
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

            <Form.Item name={['llm', 'apiUrl']} label="API地址">
              <Input placeholder="如: https://api.anthropic.com" />
            </Form.Item>
            <Form.Item name={['llm', 'apiKey']} label="API Key">
              <Input.Password placeholder="输入您的API密钥" />
            </Form.Item>
            <Form.Item name={['llm', 'model']} label="模型名称">
              <Input placeholder="如: claude-sonnet-4-6, glm-5" />
            </Form.Item>
            <Form.Item name={['llm', 'format']} initialValue="openai" hidden>
              <Input />
            </Form.Item>
            <Button icon={<Server size={14} />} onClick={testConnection} loading={testing} style={{ marginRight: 8 }}>测试连接</Button>
            <span style={{ fontSize: 12, color: '#6B7280' }}>测试前会自动保存配置</span>
          </Card>

          <Card title="快捷键设置" style={{ marginBottom: 16 }}>
            <Form.Item name={['shortcut', 'key']} label="全局快捷键">
              <div style={{ position: 'relative' }}>
                <input
                  ref={keyInputRef}
                  type="text"
                  readOnly
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '4px 11px',
                    border: `1px solid ${recordingKey ? '#1890ff' : '#d9d9d9'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: recordingKey ? '#e6f7ff' : '#fff',
                    textAlign: 'center',
                    fontSize: 14,
                  }}
                  placeholder={recordingKey ? '请按下快捷键组合...' : '点击此处录制快捷键'}
                  value={recordingKey ? recordedKeys.join('+') : (form.getFieldValue(['shortcut', 'key']) || '')}
                  onKeyDown={handleKeyDown}
                  onClick={() => {
                    if (!recordingKey) startRecording();
                  }}
                  onBlur={() => {
                    if (recordingKey) stopRecording();
                  }}
                />
                {!recordingKey && (
                  <Button
                    size="small"
                    style={{ position: 'absolute', right: 8, top: 4 }}
                    onClick={startRecording}
                  >
                    录制
                  </Button>
                )}
              </div>
            </Form.Item>
            <Form.Item name={['shortcut', 'enabled']} label="启用快捷键" valuePropName="checked">
              <Switch />
            </Form.Item>
            <p style={{ fontSize: 12, color: '#6B7280' }}>
              {recordingKey ? '按下 Ctrl/Shift/Alt + 字母键 组合，松开后自动完成录制' : '点击输入框或录制按钮开始捕获快捷键'}
            </p>
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

          {import.meta.env.DEV && (
            <Card
              title="提示词管理"
              style={{ marginBottom: 16, cursor: 'pointer' }}
              onClick={() => onNavigate?.('prompt-manager')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: 14 }}>
                    自定义各功能的AI提示词模板，实时生效
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#9CA3AF', fontSize: 12 }}>
                    包含：意图识别、反馈分析、数据清洗、RAG问答等
                  </p>
                </div>
                <FileText size={24} color="#3B82F6" />
              </div>
            </Card>
          )}

          <Button type="primary" htmlType="submit" icon={<Save size={14} />} size="large">保存设置</Button>
        </Form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;