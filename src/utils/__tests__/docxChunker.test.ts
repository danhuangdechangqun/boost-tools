import { describe, it, expect } from 'vitest';
import { docxChunker, extractSubHeadingsFromHtml } from '../docxChunker';

describe('docxChunker', () => {
  test('should create BigChunk only for h1 headings', () => {
    const html = `<h1>第一章</h1><p>这是第一章内容。</p><h2>1.1 背景</h2><p>这是背景内容。</p><h2>1.2 目标</h2><p>目标内容。</p>`;

    const chunks = docxChunker(html);

    // 只有一个 BigChunk（h1）
    expect(chunks.length).toBe(1);
    expect(chunks[0].boundaryType).toBe('heading');
    expect(chunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(chunks[0].metadata?.headingLevel).toBe(1);
    // BigChunk 包含所有子标题和内容
    expect(chunks[0].content).toContain('1.1 背景');
    expect(chunks[0].content).toContain('1.2 目标');
  });

  test('should create multiple BigChunks for multiple h1 headings', () => {
    const html = `<h1>第一章</h1><p>第一章内容。</p><h1>第二章</h1><p>第二章内容。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.length).toBe(2);
    expect(chunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(chunks[1].metadata?.headingPath).toEqual(['第二章']);
  });

  test('should collect table content into BigChunk', () => {
    const html = `<h1>表格示例</h1><table><tr><td>a</td><td>b</td></tr></table><p>后续段落。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.length).toBe(1);
    // 表格内容应该包含在 BigChunk 中
    expect(chunks[0].content).toContain('a');
    expect(chunks[0].content).toContain('b');
  });

  test('should collect list content into BigChunk', () => {
    const html = `<h1>列表示例</h1><ul><li>项目1</li><li>项目2</li></ul><p>后续段落。</p>`;

    const chunks = docxChunker(html);

    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('- 项目1');
    expect(chunks[0].content).toContain('- 项目2');
  });

  test('should handle document without h1 heading', () => {
    const html = `<h2>二级标题</h2><p>内容段落。</p>`;

    const chunks = docxChunker(html);

    // 无 h1 时，内容会被收集
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('二级标题');
  });

  test('should handle ordered list', () => {
    const html = `<h1>步骤</h1><ol><li>第一步</li><li>第二步</li></ol>`;

    const chunks = docxChunker(html);

    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('1. 第一步');
    expect(chunks[0].content).toContain('2. 第二步');
  });
});

describe('extractSubHeadingsFromHtml', () => {
  test('should extract h2 headings as SmallChunk boundaries', () => {
    const content = `<h1>第一章</h1><p>内容。</p><h2>1.1 背景</h2><p>背景内容。</p><h2>1.2 目标</h2><p>目标内容。</p>`;

    const subSections = extractSubHeadingsFromHtml(content);

    // 应包含 h2 标题段落
    expect(subSections.length).toBeGreaterThanOrEqual(2);
    expect(subSections.some(s => s.headingPath.includes('1.1 背景'))).toBe(true);
    expect(subSections.some(s => s.headingPath.includes('1.2 目标'))).toBe(true);
  });

  test('should extract numbered paragraphs from plain text', () => {
    const content = `2.1.新增授权：
用户-部门人员批量新增...

2.2.修改授权
一个人要修改多个岗位...`;

    const subSections = extractSubHeadingsFromHtml(content);

    // 应识别编号段落作为二级边界
    expect(subSections.length).toBeGreaterThanOrEqual(1);
    // 每个段落应该包含对应内容
    expect(subSections[0].text).toContain('新增授权');
  });
});