import { v4 as uuidv4 } from 'uuid';
import { BigChunk, SmallChunk, BoundaryType, DocumentType } from '@/views/ai/KnowledgeBasePage/types';
import { markdownChunker, extractSubHeadings } from './markdownChunker';
import { docxChunker, extractSubHeadingsFromHtml } from './docxChunker';

// 编号模式正则
const NUMBERED_PATTERNS = [
  /^\d+\.\s*/,           // "1. xxx"
  /^第\d+点\s*/,          // "第1点 xxx"
  /^步骤\d+\s*/,          // "步骤1 xxx"
  /^第\d+条\s*/,          // "第X条 xxx"
];

// 边界检测结果
interface BoundaryResult {
  content: string;
  start: number;
  end: number;
  boundaryType: BoundaryType;
  metadata?: {
    headingPath?: string[];
    headingLevel?: number;
  };
}

// 子标题段落结果
interface SubSection {
  text: string;
  headingPath: string[];
}

/**
 * 检测编号段落边界
 * 优先级最高：匹配 "1."、"第X点"、"步骤X"、"第X条" 等格式
 */
export function detectNumberedBoundaries(text: string): BoundaryResult[] {
  const lines = text.split('\n');
  const results: BoundaryResult[] = [];
  let position = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    let isNumbered = false;

    for (const pattern of NUMBERED_PATTERNS) {
      if (pattern.test(trimmedLine)) {
        isNumbered = true;
        break;
      }
    }

    if (isNumbered) {
      // 新段落开始，保存前一个段落
      results.push({
        content: trimmedLine,
        start: position,
        end: position + line.length,
        boundaryType: 'numbered'
      });
    } else if (results.length > 0) {
      // 非编号行，追加到上一个段落
      const last = results[results.length - 1];
      last.content += '\n' + trimmedLine;
      last.end = position + line.length;
    }

    position += line.length + 1; // +1 for newline
  }

  return results;
}

/**
 * 检测换行边界
 * @param mode 'double' 双换行优先，'single' 单换行
 */
export function detectNewlineBoundaries(text: string, mode: 'double' | 'single'): BoundaryResult[] {
  const separator = mode === 'double' ? '\n\n' : '\n';
  const parts = text.split(separator).filter(p => p.trim());
  const boundaryType = mode === 'double' ? 'paragraph' : 'newline';

  let position = 0;
  return parts.map((part, index) => {
    const start = text.indexOf(part, position);
    const end = start + part.length;
    position = end;
    return {
      content: part.trim(),
      start,
      end,
      boundaryType
    };
  });
}

/**
 * 滑窗重叠切分超长内容
 */
function splitBySizeWithOverlap(
  content: string,
  size: number,
  overlap: number
): string[] {
  const parts: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + size, content.length);
    parts.push(content.slice(start, end).trim());

    // 滑窗：下一个片段起始位置 = 当前结束位置 - 重叠字符
    start = end - overlap;
    if (start >= content.length - overlap) break;
  }

  return parts.filter(p => p.length > 0);
}

/**
 * SmallChunk 语义切分：在 BigChunk 内按二级标题切分
 * 超长段落用滑窗重叠
 */
export function splitSmallChunksSemantically(
  content: string,
  smallChunkSize: number,
  overlap: number,
  bigChunkId: string,
  documentId: string,
  docType: DocumentType,
  bigChunkHeadingPath: string[] = []
): Omit<SmallChunk, 'id'>[] {
  // 1. 根据文档类型识别二级标题边界
  let subSections: SubSection[] = [];

  if (docType === 'md') {
    subSections = extractSubHeadings(content);
  } else if (docType === 'docx') {
    subSections = extractSubHeadingsFromHtml(content);
  } else {
    // TXT/PDF/JSON：按段落或编号切分
    subSections = extractParagraphs(content);
  }

  // 2. 每个二级标题段落作为一个 SmallChunk
  // 3. 超长的用滑窗重叠切分
  const chunks: Omit<SmallChunk, 'id'>[] = [];
  let index = 0;

  for (const section of subSections) {
    // 组合完整的 headingPath：BigChunk 路径 + 子标题路径
    const fullHeadingPath = [...bigChunkHeadingPath, ...section.headingPath];

    if (section.text.length <= smallChunkSize) {
      // 不超长：直接作为一个 SmallChunk
      chunks.push({
        documentId,
        bigChunkId,
        content: section.text.trim(),
        embedding: undefined,
        position: { start: 0, end: section.text.length, index },
        metadata: { heading: fullHeadingPath.join(' > ') }
      });
      index++;
    } else {
      // 超长：滑窗重叠切分
      const parts = splitBySizeWithOverlap(section.text, smallChunkSize, overlap);
      for (const part of parts) {
        chunks.push({
          documentId,
          bigChunkId,
          content: part,
          embedding: undefined,
          position: { start: 0, end: part.length, index },
          metadata: { heading: fullHeadingPath.join(' > ') }
        });
        index++;
      }
    }
  }

  return chunks;
}

/**
 * 从文本中提取段落（用于 TXT/PDF/JSON）
 */
function extractParagraphs(content: string): SubSection[] {
  // 尝试识别二级编号段落（如 1.1、2.1）
  const subHeadingPattern = /^(\d+\.\d+[\.\d]*)\s+/;
  const lines = content.split('\n');
  const results: SubSection[] = [];
  let currentSection = '';
  let currentHeadingPath: string[] = [];
  let hasSubHeading = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(subHeadingPattern);

    if (match) {
      // 找到二级编号段落
      if (currentSection.trim()) {
        results.push({ text: currentSection.trim(), headingPath: currentHeadingPath });
      }
      currentHeadingPath = [trimmedLine];
      currentSection = line + '\n';
      hasSubHeading = true;
    } else {
      currentSection += line + '\n';
    }
  }

  if (currentSection.trim()) {
    results.push({ text: currentSection.trim(), headingPath: currentHeadingPath });
  }

  // 无二级编号时，按双换行切分段落
  if (!hasSubHeading) {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map(p => ({ text: p.trim(), headingPath: [] }));
  }

  return results;
}

/**
 * 根据文档类型切分BigChunk - 只识别一级标题边界
 */
export function splitBigChunks(
  text: string,
  docType: DocumentType,
  maxSize: number = 800,
  html?: string  // Word 导入时传入 HTML
): BoundaryResult[] {
  let boundaries: BoundaryResult[];

  switch (docType) {
    case 'md':
      boundaries = markdownChunker(text);
      break;

    case 'docx':
      boundaries = html ? docxChunker(html) : detectNewlineBoundaries(text, 'double');
      break;

    case 'txt':
      // TXT：尝试识别一级编号段落
      boundaries = detectTopLevelNumberedBoundaries(text);
      if (boundaries.length === 0) {
        boundaries = detectNewlineBoundaries(text, 'double');
      }
      break;

    case 'pdf':
      boundaries = detectNewlineBoundaries(text, 'double');
      break;

    case 'json':
      boundaries = [{
        content: text,
        start: 0,
        end: text.length,
        boundaryType: 'paragraph'
      }];
      break;

    default:
      boundaries = detectNewlineBoundaries(text, 'double');
  }

  return boundaries;
}

/**
 * 检测一级编号段落边界（如 1.、2. 等）
 */
function detectTopLevelNumberedBoundaries(text: string): BoundaryResult[] {
  const lines = text.split('\n');
  const results: BoundaryResult[] = [];
  let position = 0;
  let currentContent = '';
  let currentStart = 0;

  // 一级编号模式：单独的数字加点，如 "1."、"2."
  const topLevelPattern = /^(\d+)\.\s+/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(topLevelPattern);

    if (match) {
      // 找到一级编号：保存之前的段落，开始新的
      if (currentContent.trim()) {
        results.push({
          content: currentContent.trim(),
          start: currentStart,
          end: position,
          boundaryType: 'numbered'
        });
      }
      currentContent = line + '\n';
      currentStart = position;
    } else {
      // 其他内容累积到当前段落
      currentContent += line + '\n';
    }

    position += line.length + 1;
  }

  // 保存最后的段落
  if (currentContent.trim()) {
    results.push({
      content: currentContent.trim(),
      start: currentStart,
      end: text.length,
      boundaryType: 'numbered'
    });
  }

  return results;
}

/**
 * 完整文档切分：Big Chunk -> Small Chunk（语义切分）
 */
export function chunkDocument(
  content: string,
  docType: DocumentType,
  documentId: string,
  config: {
    bigChunkMaxSize: number;
    smallChunkSize: number;
    smallChunkOverlap: number;
  },
  html?: string  // Word 导入时传入
): BigChunk[] {
  const bigBoundaries = splitBigChunks(content, docType, config.bigChunkMaxSize, html);

  const bigChunks: BigChunk[] = bigBoundaries.map((b, bigIndex) => {
    const bigChunkId = uuidv4();

    // 使用语义切分替代纯字符切分
    const smallChunksRaw = splitSmallChunksSemantically(
      b.content,
      config.smallChunkSize,
      config.smallChunkOverlap,
      bigChunkId,
      documentId,
      docType,
      b.metadata?.headingPath || []
    );

    const smallChunks: SmallChunk[] = smallChunksRaw.map((s, smallIndex) => ({
      ...s,
      id: uuidv4(),
      position: { ...s.position, index: smallIndex }
    }));

    return {
      id: bigChunkId,
      documentId,
      content: b.content,
      smallChunks,
      position: {
        start: b.start,
        end: b.end,
        index: bigIndex
      },
      boundaryType: b.boundaryType,
      metadata: b.metadata
    };
  });

  return bigChunks;
}