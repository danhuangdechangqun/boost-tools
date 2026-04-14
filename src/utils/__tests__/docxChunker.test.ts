import { docxChunker } from '../docxChunker';

describe('docxChunker', () => {
  test('should split by headings', () => {
    const html = `<h1>第一章</h1><p>这是第一章内容。</p><h2>1.1 背景</h2><p>这是背景内容。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some(c => c.boundaryType === 'heading')).toBe(true);
  });

  test('should handle table as single chunk', () => {
    const html = `<h1>表格示例</h1><table><tr><td>a</td><td>b</td></tr></table><p>后续段落。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.some(c => c.boundaryType === 'table')).toBe(true);
  });

  test('should handle list as single chunk', () => {
    const html = `<h1>列表示例</h1><ul><li>项目1</li><li>项目2</li></ul><p>后续段落。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.some(c => c.boundaryType === 'list')).toBe(true);
    const listChunk = chunks.find(c => c.boundaryType === 'list');
    expect(listChunk?.content).toContain('- 项目1');
  });

  test('should handle ordered list', () => {
    const html = `<ol><li>第一步</li><li>第二步</li></ol>`;

    const chunks = docxChunker(html);

    expect(chunks.some(c => c.boundaryType === 'list')).toBe(true);
    const listChunk = chunks.find(c => c.boundaryType === 'list');
    expect(listChunk?.content).toContain('1. 第一步');
    expect(listChunk?.content).toContain('2. 第二步');
  });
});