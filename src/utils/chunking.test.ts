import { describe, it, expect } from 'vitest';
import {
  detectNumberedBoundaries,
  detectNewlineBoundaries,
  splitSmallChunks,
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

describe('splitSmallChunks', () => {
  it('应该将BigChunk切分成多个SmallChunk', () => {
    const content = '这是一个很长的段落内容，需要被切分成多个小块进行向量检索。这是第二部分的内容，确保内容足够长以触发切分逻辑。这是第三部分，继续增加文本长度。';
    const smallChunks = splitSmallChunks(content, 30, 5);
    expect(smallChunks.length).toBeGreaterThan(1);
    expect(smallChunks[0].content.length).toBeLessThanOrEqual(30);
  });

  it('短内容应该返回单个SmallChunk', () => {
    const content = '短内容';
    const smallChunks = splitSmallChunks(content, 100, 10);
    expect(smallChunks).toHaveLength(1);
  });

  it('应该正确计算overlap', () => {
    const content = 'ABCDEFghijklmnopqrstuvwxyz';
    const smallChunks = splitSmallChunks(content, 10, 3);
    // 检查相邻chunk是否有overlap
    if (smallChunks.length > 1) {
      const overlap = smallChunks[0].content.slice(-3);
      expect(smallChunks[1].content.startsWith(overlap)).toBe(true);
    }
  });
});