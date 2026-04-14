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
  // 标题层级变化时，截断到对应层级再追加
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
 * Markdown AST 解析切分
 */
export function markdownChunker(
  text: string,
  maxSize: number = 800
): BoundaryResult[] {
  const tokens = marked.lexer(text);
  const results: BoundaryResult[] = [];
  let currentHeadingPath: string[] = [];
  let currentLevel = 0;
  let currentContent = '';
  let currentType: BoundaryType = 'paragraph';

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        // 保存之前累积的内容
        if (currentContent.trim()) {
          results.push(createBoundary(currentContent, currentType, currentHeadingPath, currentLevel));
        }

        // 更新标题路径和层级
        const headingText = token.text || '';
        currentLevel = token.depth;
        currentHeadingPath = updateHeadingPath(currentHeadingPath, headingText, currentLevel);

        // 开始新的标题段落
        currentContent = `# ${headingText}\n`;
        currentType = 'heading';
        break;
      }

      case 'code': {
        // 代码块独立成片
        const codeContent = token.text || '';
        const lang = token.lang || '';
        const fullCode = `\`\`\`${lang}\n${codeContent}\n\`\`\`\n`;

        results.push(createBoundary(fullCode, 'code', currentHeadingPath));
        break;
      }

      case 'table': {
        // 表格独立成片
        const tableContent = renderTableToken(token);
        results.push(createBoundary(tableContent, 'table', currentHeadingPath));
        break;
      }

      case 'list': {
        // 列表独立成片
        const listContent = renderListToken(token);
        results.push(createBoundary(listContent, 'list', currentHeadingPath));
        break;
      }

      case 'paragraph': {
        // 段落累积到当前内容
        const textContent = token.text || '';
        currentContent += textContent + '\n';
        break;
      }

      case 'hr': {
        // 分隔线作为边界
        if (currentContent.trim()) {
          results.push(createBoundary(currentContent, currentType, currentHeadingPath, currentLevel));
        }
        currentContent = '';
        currentType = 'paragraph';
        break;
      }

      default:
        // 其他类型忽略或累积
        break;
    }
  }

  // 保存最后累积的内容
  if (currentContent.trim()) {
    results.push(createBoundary(currentContent, currentType, currentHeadingPath, currentLevel));
  }

  // 处理超长段落（代码块、表格、列表不拆分）
  const finalResults: BoundaryResult[] = [];
  for (const r of results) {
    if (r.content.length > maxSize && r.boundaryType === 'paragraph') {
      // 超长普通段落按字符拆分
      const subParts = splitBySize(r.content, maxSize);
      let pos = 0;
      for (const sub of subParts) {
        finalResults.push({
          content: sub,
          start: r.start + pos,
          end: r.start + pos + sub.length,
          boundaryType: r.boundaryType,
          metadata: r.metadata
        });
        pos += sub.length;
      }
    } else {
      finalResults.push(r);
    }
  }

  return finalResults;
}

/**
 * 按固定大小拆分超长内容
 */
function splitBySize(content: string, size: number): string[] {
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

  return rows.join('\n') + '\n';
}

/**
 * 渲染列表 token 为文本
 */
function renderListToken(token: Token): string {
  if (token.type !== 'list') return '';

  const list = token as Tokens.List;
  const items: string[] = [];
  const indent = list.loose ? '' : '  ';

  for (const item of list.items || []) {
    const prefix = list.ordered ? `${item.start || 1}. ` : '- ';
    const text = item.text || '';
    items.push(indent + prefix + text);
  }

  return items.join('\n') + '\n';
}