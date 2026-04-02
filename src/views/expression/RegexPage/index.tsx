import React, { useState } from 'react';
import { Button, Card, Input, message, Spin, Divider } from 'antd';
import { ArrowLeft, Copy, Sparkles, Wand2 } from 'lucide-react';
import { callLlm } from '@/services/api';

interface RegexPageProps {
  onBack: () => void;
}

const presets = [
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]' },
  { name: '双字节字符', pattern: '[^\\x00-\\xff]' },
  { name: '空白行', pattern: '\\n\\s*\\r' },
  { name: 'Email地址', pattern: '[\\w-]+(\\.[\\w-]+)*@[\\w-]+(\\.[\\w-]+)+' },
  { name: '网址URL', pattern: 'https?://[\\w-]+(\\.[\\w-]+)+[/\\w-.,@?^=%&:~+#]*' },
  { name: '国内电话', pattern: '\\d{3}-\\d{8}|\\d{4}-\\d{7}' },
  { name: '手机号', pattern: '1[3-9]\\d{9}' },
  { name: 'QQ号', pattern: '[1-9][0-9]{4,}' },
  { name: '邮政编码', pattern: '[1-9]\\d{5}' },
  { name: '身份证号', pattern: '[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]' },
  { name: '日期(年-月-日)', pattern: '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])' },
  { name: '时间(时:分:秒)', pattern: '([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d' },
  { name: '正整数', pattern: '[1-9]\\d*' },
  { name: '整数', pattern: '-?[1-9]\\d*|0' },
  { name: '浮点数', pattern: '-?\\d+(\\.\\d+)?' },
  { name: 'IP地址', pattern: '((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)' },
  { name: 'HTML标签', pattern: '<[^>]+>' },
];

const examples = [
  '匹配以http开头以.html结尾的URL',
  '匹配6-16位包含字母和数字的密码',
  '匹配中国大陆车牌号',
  '匹配yyyy-MM-dd HH:mm:ss格式的时间',
  '匹配银行卡号（16-19位数字）',
];

const RegexPage: React.FC<RegexPageProps> = ({ onBack }) => {
  const [pattern, setPattern] = useState('');
  const [testText, setTestText] = useState('');
  const [matchResult, setMatchResult] = useState<string[]>([]);
  const [naturalInput, setNaturalInput] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);

  const testPattern = () => {
    try {
      const regex = new RegExp(pattern, 'g');
      const matches = testText.match(regex) || [];
      setMatchResult(matches);
      message.success(`匹配到 ${matches.length} 个结果`);
    } catch (e: any) {
      message.error('正则表达式语法错误');
    }
  };

  // LLM生成正则
  const generateByLLM = async () => {
    if (!naturalInput.trim()) {
      message.warning('请输入需求描述');
      return;
    }

    setLlmLoading(true);
    try {
      const prompt = `你是一个正则表达式专家。请根据用户的需求描述，生成对应的正则表达式。

规则：
1. 只输出正则表达式本身，不要解释，不要加代码块标记
2. 确保表达式正确且高效
3. 如果用户描述不够清晰，给出最通用的匹配方案

用户需求：${naturalInput}

请输出正则表达式：`;

      const result = await callLlm(prompt);
      let generated = result.trim();
      // 如果包含markdown代码块，提取其中的内容
      const match = generated.match(/```(?:regex|re)?\s*([\s\S]*?)```/);
      if (match) {
        generated = match[1].trim();
      }
      // 移除前后的斜杠（如果有的话）
      if (generated.startsWith('/') && generated.endsWith('/')) {
        generated = generated.slice(1, -1);
      }
      setPattern(generated);
      message.success('正则表达式生成成功');
    } catch (e: any) {
      message.error('生成失败: ' + (e?.message || e));
    }
    setLlmLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>正则表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* LLM自然语言生成区域 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={16} color="#8B5CF6" />
              <span>AI智能生成</span>
            </div>
          }
          style={{ marginBottom: 16 }}
          extra={<Spin spinning={llmLoading} size="small" />}
        >
          <Input.TextArea
            rows={3}
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder="用自然语言描述你的匹配需求，例如：匹配以http开头以.html结尾的URL"
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            icon={<Sparkles size={14} />}
            onClick={generateByLLM}
            loading={llmLoading}
          >
            AI生成正则
          </Button>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>示例：</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {examples.map((ex, i) => (
                <Button
                  key={i}
                  size="small"
                  onClick={() => setNaturalInput(ex)}
                  style={{ fontSize: 11 }}
                >
                  {ex.length > 18 ? ex.substring(0, 18) + '...' : ex}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Divider>或选择预设</Divider>

        {/* 预设区域 */}
        <Card title="常用预设" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => (
              <Button key={p.name} size="small" onClick={() => setPattern(p.pattern)}>{p.name}</Button>
            ))}
          </div>
        </Card>

        {/* 表达式区域 */}
        <Card title="生成的正则表达式" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="选择预设或使用AI生成..."
              style={{ fontFamily: 'monospace', fontSize: 14 }}
            />
            <Button type="primary" icon={<Copy size={14} />} onClick={() => {
              if (!pattern) {
                message.warning('表达式为空');
                return;
              }
              navigator.clipboard.writeText(pattern);
              message.success('已复制');
            }}>复制</Button>
          </div>
        </Card>

        {/* 测试区域 */}
        <Card title="测试匹配">
          <Input.TextArea
            rows={4}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入测试文本"
          />
          <Button type="primary" style={{ marginTop: 8 }} onClick={testPattern}>测试匹配</Button>
          {matchResult.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span style={{ color: '#16A34A', fontWeight: 500 }}>匹配到 {matchResult.length} 个结果：</span>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {matchResult.map((m, i) => (
                  <span key={i} style={{ padding: '2px 8px', background: '#DCFCE7', color: '#16A34A', borderRadius: 4, fontFamily: 'monospace' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegexPage;