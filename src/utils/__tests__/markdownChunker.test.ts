import { markdownChunker } from '../markdownChunker';

describe('markdownChunker', () => {
  test('should split by headings', () => {
    const text = `# 第一章
这是第一章内容。

## 1.1 背景
这是背景内容。`;

    const chunks = markdownChunker(text);

    expect(chunks.length).toBe(2);
    expect(chunks[0].boundaryType).toBe('heading');
    expect(chunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(chunks[1].metadata?.headingPath).toEqual(['第一章', '1.1 背景']);
  });

  test('should handle code block as single chunk', () => {
    const text = `# 代码示例

\`\`\`python
def hello():
    print("hello")
    print("world")
\`\`\`

后续段落。`;

    const chunks = markdownChunker(text);

    expect(chunks.some(c => c.boundaryType === 'code')).toBe(true);
    const codeChunk = chunks.find(c => c.boundaryType === 'code');
    expect(codeChunk?.content).toContain('def hello():');
  });

  test('should handle table as single chunk', () => {
    const text = `# 表格示例

| 列1 | 列2 |
|-----|-----|
| a   | b   |
| c   | d   |

后续段落。`;

    const chunks = markdownChunker(text);

    expect(chunks.some(c => c.boundaryType === 'table')).toBe(true);
  });

  test('should handle list as single chunk', () => {
    const text = `# 列表示例

- 项目1
- 项目2
- 项目3

后续段落。`;

    const chunks = markdownChunker(text);

    expect(chunks.some(c => c.boundaryType === 'list')).toBe(true);
  });

  test('should handle nested heading path', () => {
    const text = `# 第一章
## 1.1 背景
### 1.1.1 详细说明
详细内容`;

    const chunks = markdownChunker(text);

    expect(chunks[2].metadata?.headingPath).toEqual(['第一章', '1.1 背景', '1.1.1 详细说明']);
    expect(chunks[2].metadata?.headingLevel).toBe(3);
  });
});