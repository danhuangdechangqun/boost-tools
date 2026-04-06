import { v4 as uuidv4 } from 'uuid';
import { BigChunk, SmallChunk, BoundaryType, DocumentType } from '@/views/ai/KnowledgeBasePage/types';

// 编号模式正则
const NUMBERED_PATTERNS = [
  /^\d+\.\s*/,           // "1. xxx"
  /^第\d+点\s*/,          // "第1点 xxx"
  /^步骤\d+\s*/,          // "步骤1 xxx"
  /^第\d+条\s*/,          // "第1条 xxx"
];

// 边界检测结果
interface BoundaryResult {
  content: string;
  start: number;
  end: number;
  boundaryType: BoundaryType;
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
 * 将BigChunk内容切分成多个SmallChunk
 */
export function splitSmallChunks(
  content: string,
  smallSize: number,
  overlap: number,
  bigChunkId: string = '',
  documentId: string = ''
): Omit<SmallChunk, 'id'>[] {
  if (content.length <= smallSize) {
    return [{
      documentId,
      bigChunkId,
      content: content.trim(),
      embedding: undefined,
      position: { start: 0, end: content.length, index: 0 }
    }];
  }

  const chunks: Omit<SmallChunk, 'id'>[] = [];
  let start = 0;
  let index = 0;

  while (start < content.length) {
    const end = Math.min(start + smallSize, content.length);
    const chunkContent = content.slice(start, end).trim();

    if (chunkContent) {
      chunks.push({
        documentId,
        bigChunkId,
        content: chunkContent,
        embedding: undefined,
        position: { start, end, index }
      });
      index++;
    }

    start = end - overlap;
    if (start >= content.length - overlap) break;
  }

  return chunks;
}

/**
 * 根据文档类型切分BigChunk
 */
export function splitBigChunks(
  text: string,
  docType: DocumentType,
  maxSize: number = 800
): BoundaryResult[] {
  let boundaries: BoundaryResult[];

  switch (docType) {
    case 'md':
      boundaries = detectNewlineBoundaries(text, 'double');
      boundaries = boundaries.map(b => ({ ...b, boundaryType: 'heading' as BoundaryType }));
      break;

    case 'txt':
      boundaries = detectNumberedBoundaries(text);
      if (boundaries.length === 0) {
        boundaries = detectNewlineBoundaries(text, 'double');
      }
      if (boundaries.length === 0) {
        boundaries = detectNewlineBoundaries(text, 'single');
      }
      break;

    case 'docx':
    case 'pdf':
      boundaries = detectNewlineBoundaries(text, 'double');
      break;

    default:
      boundaries = detectNewlineBoundaries(text, 'double');
  }

  // 处理超长段落
  const finalBoundaries: BoundaryResult[] = [];
  for (const b of boundaries) {
    if (b.content.length > maxSize) {
      const subParts = splitContentBySize(b.content, maxSize);
      let subPosition = b.start;
      for (const subPart of subParts) {
        finalBoundaries.push({
          content: subPart,
          start: subPosition,
          end: subPosition + subPart.length,
          boundaryType: b.boundaryType
        });
        subPosition += subPart.length;
      }
    } else {
      finalBoundaries.push(b);
    }
  }

  return finalBoundaries;
}

/**
 * 按固定大小切分超长内容
 */
function splitContentBySize(content: string, size: number): string[] {
  const parts: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + size, content.length);
    parts.push(content.slice(start, end).trim());
    start = end;
  }

  return parts;
}

/**
 * 完整文档切分：Big Chunk -> Small Chunk
 */
export function chunkDocument(
  content: string,
  docType: DocumentType,
  documentId: string,
  config: {
    bigChunkMaxSize: number;
    smallChunkSize: number;
    smallChunkOverlap: number;
  }
): BigChunk[] {
  const bigBoundaries = splitBigChunks(content, docType, config.bigChunkMaxSize);

  const bigChunks: BigChunk[] = bigBoundaries.map((b, bigIndex) => {
    const bigChunkId = uuidv4();

    const smallChunksRaw = splitSmallChunks(
      b.content,
      config.smallChunkSize,
      config.smallChunkOverlap,
      bigChunkId,
      documentId
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
      boundaryType: b.boundaryType
    };
  });

  return bigChunks;
}