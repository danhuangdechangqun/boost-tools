import { marked, Token, Tokens } from 'marked';
import { BoundaryType } from '@/views/ai/KnowledgeBasePage/types';

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

/**
 * 更新标题路径，根据层级截断或追加
 */
function updateHeadingPath(
  currentPath: string[],
  headingText: string,
  level: number
): string[] {
  const newPath = currentPath.slice(0, level - 1);
  newPath.push(headingText);
  return newPath;
}

/**
 * 创建边界结果
 */
function createBoundary(
  content: string,
  type: BoundaryType,
  headingPath: string[],
  level?: number
): BoundaryResult {
  return {
    content: content.trim(),
    start: 0,
    end: content.length,
    boundaryType: type,
    metadata: {
      headingPath,
      headingLevel: level
    }
  };
}

/**
 * 渲染 token 为文本
 */
function renderToken(token: Token): string {
  switch (token.type) {
    case 'heading':
      const prefix = '#'.repeat(token.depth);
      return `${prefix} ${token.text || ''}\n\n`;

    case 'code':
      const lang = token.lang || '';
      return `\`\`\`${lang}\n${token.text || ''}\n\`\`\`\n\n`;

    case 'table':
      return renderTableToken(token) + '\n';

    case 'list':
      return renderListToken(token) + '\n';

    case 'paragraph':
      return (token.text || '') + '\n\n';

    case 'hr':
      return '---\n\n';

    default:
      return '';
  }
}

/**
 * 渲染表格 token 为文本
 */
function renderTableToken(token: Token): string {
  if (token.type !== 'table') return '';

  const table = token as Tokens.Table;
  const rows: string[] = [];

  // 表头
  if (table.header) {
    const headerRow = '| ' + table.header.map(h => h.text).join(' | ') + ' |';
    rows.push(headerRow);
    const separatorRow = '| ' + table.header.map(() => '---').join(' | ') + ' |';
    rows.push(separatorRow);
  }

  // 表体
  if (table.rows) {
    for (const row of table.rows) {
      const rowText = '| ' + row.map(cell => cell.text).join(' | ') + ' |';
      rows.push(rowText);
    }
  }

  return rows.join('\n');
}

/**
 * 渲染列表 token 为文本
 */
function renderListToken(token: Token): string {
  if (token.type !== 'list') return '';

  const list = token as Tokens.List;
  const items: string[] = [];

  let itemIndex = list.start || 1;
  for (const item of list.items || []) {
    const prefix = list.ordered ? `${itemIndex}. ` : '- ';
    const text = item.text || '';
    items.push(prefix + text);
    if (list.ordered) itemIndex++;
  }

  return items.join('\n');
}

/**
 * Markdown AST 解析切分 - BigChunk 级别
 * 只识别一级标题（depth=1）作为 BigChunk 边界
 */
export function markdownChunker(
  text: string
): BoundaryResult[] {
  const tokens = marked.lexer(text);
  const results: BoundaryResult[] = [];
  let currentBigChunk = '';
  let currentHeadingPath: string[] = [];
  let hasTopLevelHeading = false;

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        // 一级标题：保存之前的 BigChunk，开始新的
        if (currentBigChunk.trim()) {
          results.push(createBoundary(currentBigChunk, 'heading', currentHeadingPath, 1));
        }
        currentHeadingPath = [token.text || ''];
        currentBigChunk = renderToken(token);
        hasTopLevelHeading = true;
      } else {
        // 子标题：累积到当前 BigChunk
        currentBigChunk += renderToken(token);
      }
    } else {
      // 其他内容累积到当前 BigChunk
      currentBigChunk += renderToken(token);
    }
  }

  // 保存最后的 BigChunk
  if (currentBigChunk.trim()) {
    results.push(createBoundary(currentBigChunk, 'heading', currentHeadingPath, 1));
  }

  // 无一级标题时，整文档作为一个 BigChunk
  if (!hasTopLevelHeading && results.length === 0 && text.trim()) {
    results.push(createBoundary(text, 'paragraph', [], undefined));
  }

  return results;
}

/**
 * 在 BigChunk 内识别二级标题边界，返回子标题段落列表
 * 用于 SmallChunk 切分参考
 */
export function extractSubHeadings(content: string): { text: string; headingPath: string[] }[] {
  const tokens = marked.lexer(content);
  const results: { text: string; headingPath: string[] }[] = [];
  let currentSection = '';
  let currentSubHeadingPath: string[] = [];
  let hasSubHeading = false;

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 2) {
        // 二级标题：保存之前的段落，开始新的
        if (currentSection.trim()) {
          results.push({ text: currentSection.trim(), headingPath: currentSubHeadingPath });
        }
        currentSubHeadingPath = [token.text || ''];
        currentSection = renderToken(token);
        hasSubHeading = true;
      } else if (token.depth >= 3) {
        // 三级及以下标题：累积到当前段落
        currentSection += renderToken(token);
        // 更新子标题路径
        currentSubHeadingPath = updateHeadingPath(currentSubHeadingPath, token.text || '', token.depth);
      } else if (token.depth === 1) {
        // 一级标题：累积（BigChunk 可能以一级标题开头）
        currentSection += renderToken(token);
      }
    } else {
      // 其他内容累积到当前段落
      currentSection += renderToken(token);
    }
  }

  // 保存最后的段落
  if (currentSection.trim()) {
    results.push({ text: currentSection.trim(), headingPath: currentSubHeadingPath });
  }

  // 无二级标题时，返回整体内容
  if (!hasSubHeading && results.length === 0 && content.trim()) {
    results.push({ text: content.trim(), headingPath: [] });
  }

  return results;
}