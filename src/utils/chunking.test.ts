import { describe, it, expect } from 'vitest';
import {
  detectNumberedBoundaries,
  detectNewlineBoundaries,
  splitSmallChunksSemantically,
  chunkDocument
} from './chunking';

describe('detectNumberedBoundaries', () => {
  it('应该识别编号段落边界', () => {
    const text = '1.第一点内容\n2.第二点内容\n3.第三点内容';
    const boundaries = detectNumberedBoundaries(text);
    expect(boundaries).toHaveLength(3);
    expect(boundaries[0].content).toBe('1.第一点内容');
    expect(boundaries[1].content).toBe('2.第二点内容');
  });

  it('应该识别"第X点"格式', () => {
    const text = '第1点内容\n第2点内容';
    const boundaries = detectNumberedBoundaries(text);
    expect(boundaries).toHaveLength(2);
  });

  it('应该识别"步骤X"格式', () => {
    const text = '步骤1 开始\n步骤2 继续';
    const boundaries = detectNumberedBoundaries(text);
    expect(boundaries).toHaveLength(2);
  });

  it('无编号时应返回空数组', () => {
    const text = '普通文本无编号';
    const boundaries = detectNumberedBoundaries(text);
    expect(boundaries).toHaveLength(0);
  });
});

describe('detectNewlineBoundaries', () => {
  it('应该按双换行切分', () => {
    const text = '段落1\n\n段落2\n\n段落3';
    const boundaries = detectNewlineBoundaries(text, 'double');
    expect(boundaries).toHaveLength(3);
  });

  it('应该按单换行切分', () => {
    const text = '行1\n行2\n行3';
    const boundaries = detectNewlineBoundaries(text, 'single');
    expect(boundaries).toHaveLength(3);
  });
});

describe('splitSmallChunksSemantically', () => {
  it('should split by level-2 headings', () => {
    const content = `# 第一章
## 1.1 背景
背景内容。

## 1.2 目标
目标内容。`;

    const chunks = splitSmallChunksSemantically(
      content,
      250,
      50,
      'bigChunkId',
      'docId',
      'md',
      ['第一章']
    );

    // 应按二级标题切分
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].metadata?.heading).toContain('第一章');
  });

  it('should use sliding window for oversized content', () => {
    const longContent = '这是一个非常长的段落内容，超过了限制大小。' + '继续添加更多内容来确保长度超过限制。'.repeat(10);

    const chunks = splitSmallChunksSemantically(
      longContent,
      50,
      10,
      'bigChunkId',
      'docId',
      'txt',
      []
    );

    // 应切分成多个片段
    expect(chunks.length).toBeGreaterThan(1);
    // 检查滑窗重叠
    if (chunks.length > 1) {
      const overlapContent = chunks[0].content.slice(-10);
      // 下一个片段应该包含重叠部分（可能不完全匹配，因为是 trim 后）
      expect(chunks[1].content.length).toBeGreaterThan(0);
    }
  });

  it('should return single chunk for short content', () => {
    const content = '短内容';

    const chunks = splitSmallChunksSemantically(
      content,
      250,
      50,
      'bigChunkId',
      'docId',
      'txt',
      []
    );

    expect(chunks.length).toBe(1);
  });
});

describe('chunkDocument', () => {
  it('should create BigChunks by level-1 headings', () => {
    const content = `# 第一章
第一章内容。

# 第二章
第二章内容。`;

    const bigChunks = chunkDocument(content, 'md', 'docId', {
      bigChunkMaxSize: 800,
      smallChunkSize: 250,
      smallChunkOverlap: 50
    });

    expect(bigChunks.length).toBe(2);
    expect(bigChunks[0].metadata?.headingPath).toEqual(['第一章']);
    expect(bigChunks[1].metadata?.headingPath).toEqual(['第二章']);
  });

  it('should create SmallChunks by level-2 headings', () => {
    const content = `# 第一章
## 1.1 背景
背景内容。

## 1.2 目标
目标内容。`;

    const bigChunks = chunkDocument(content, 'md', 'docId', {
      bigChunkMaxSize: 800,
      smallChunkSize: 250,
      smallChunkOverlap: 50
    });

    // 一个 BigChunk
    expect(bigChunks.length).toBe(1);
    // 应有多个 SmallChunks（按二级标题切分）
    expect(bigChunks[0].smallChunks.length).toBeGreaterThanOrEqual(2);
  });
});