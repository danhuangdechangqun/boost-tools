import { describe, it, expect } from 'vitest';
import { markdownChunker, extractSubHeadings } from '../markdownChunker';

describe('markdownChunker', () => {
  test('should create BigChunk only for level-1 headings', () => {
    const text = `# 第一章
这是第一章内容。

## 1.1 背景
这是背景内容。

## 1.2 目标
这是目标内容。`;

    const chunks = markdownChunker(text);

    // 只有一个 BigChunk（一级标题）
    expect(chunks.length).toBe(1);
    expect(chunks[0].boundaryType).toBe('heading');
    expect(chunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(chunks[0].metadata?.headingLevel).toBe(1);
    // BigChunk 包含所有子标题和内容
    expect(chunks[0].content).toContain('1.1 背景');
    expect(chunks[0].content).toContain('1.2 目标');
  });

  test('should create multiple BigChunks for multiple level-1 headings', () => {
    const text = `# 第一章
第一章内容。

# 第二章
第二章内容。`;

    const chunks = markdownChunker(text);

    expect(chunks.length).toBe(2);
    expect(chunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(chunks[1].metadata?.headingPath).toEqual(['第二章']);
  });

  test('should collect all content into BigChunk', () => {
    const text = `# 代码示例

\`\`\`python
def hello():
    print("hello")
\`\`\`

## 子标题
后续段落。`;

    const chunks = markdownChunker(text);

    expect(chunks.length).toBe(1);
    // 代码块应该包含在 BigChunk 中
    expect(chunks[0].content).toContain('def hello():');
    expect(chunks[0].content).toContain('子标题');
  });

  test('should handle document without level-1 heading', () => {
    const text = `## 二级标题
内容段落。`;

    const chunks = markdownChunker(text);

    // 无一级标题时，整文档作为一个 BigChunk
    expect(chunks.length).toBe(1);
    // h2 会被识别为 heading 类型并累积内容
    expect(chunks[0].content).toContain('二级标题');
  });
});

describe('extractSubHeadings', () => {
  test('should extract level-2 headings as SmallChunk boundaries', () => {
    const content = `# 第一章
这是第一章内容。

## 1.1 背景
这是背景内容。

## 1.2 目标
这是目标内容。`;

    const subSections = extractSubHeadings(content);

    // 两个二级标题段落
    expect(subSections.length).toBeGreaterThanOrEqual(2);
    // 第一个段落包含一级标题内容
    expect(subSections.some(s => s.headingPath.includes('1.1 背景'))).toBe(true);
    expect(subSections.some(s => s.headingPath.includes('1.2 目标'))).toBe(true);
  });

  test('should accumulate level-3 headings into level-2 section', () => {
    const content = `## 1.1 背景
### 1.1.1 详细说明
详细内容`;

    const subSections = extractSubHeadings(content);

    // 三级标题内容应该累积到二级标题段落中
    expect(subSections.length).toBe(1);
    expect(subSections[0].text).toContain('1.1.1 详细说明');
  });
});