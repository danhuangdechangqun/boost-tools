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

interface HtmlElement {
  tagName: string;
  text: string;
  innerHTML?: string;
  level?: number;  // 标题层级（1-6）
}

/**
 * 更新标题路径
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
 * 简单 HTML 解析（提取语义元素）
 * 按出现顺序返回元素列表
 */
function parseHtmlElements(html: string): HtmlElement[] {
  const elements: HtmlElement[] = [];
  const positions: { element: HtmlElement; pos: number }[] = [];

  // 匹配标题标签
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = stripHtmlTags(match[2]);
    const element = { tagName: `h${level}`, text, innerHTML: match[0], level };
    positions.push({ element, pos: match.index });
  }

  // 匹配表格标签
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
  while ((match = tableRegex.exec(html)) !== null) {
    const element = { tagName: 'table', text: match[1] || '', innerHTML: match[0] };
    positions.push({ element, pos: match.index });
  }

  // 匹配列表标签
  const listRegex = /<(ul|ol)[^>]*>(.*?)<\/(ul|ol)>/gi;
  while ((match = listRegex.exec(html)) !== null) {
    const listType = match[1];
    const innerHTML = match[2];
    const text = parseListItemText(innerHTML, listType === 'ol');
    const element = { tagName: listType, text, innerHTML: match[0] };
    positions.push({ element, pos: match.index });
  }

  // 匹配段落标签
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtmlTags(match[1]);
    if (text) {
      const element = { tagName: 'p', text };
      positions.push({ element, pos: match.index });
    }
  }

  // 按出现顺序排序
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map(p => p.element);
}

/**
 * 移除 HTML 标签
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * 解析列表项文本
 */
function parseListItemText(innerHTML: string, ordered: boolean): string {
  const itemRegex = /<li[^>]*>(.*?)<\/li>/gi;
  const items: string[] = [];
  let match;
  let index = 1;

  while ((match = itemRegex.exec(innerHTML)) !== null) {
    const text = stripHtmlTags(match[1]);
    const prefix = ordered ? `${index}. ` : '- ';
    items.push(prefix + text);
    index++;
  }

  return items.join('\n') + '\n';
}

/**
 * Word HTML 解析切分 - BigChunk 级别
 * 只识别一级标题（<h1>）作为 BigChunk 边界
 */
export function docxChunker(html: string): BoundaryResult[] {
  const elements = parseHtmlElements(html);
  const results: BoundaryResult[] = [];
  let currentBigChunk = '';
  let currentHeadingPath: string[] = [];
  let hasTopLevelHeading = false;

  for (const el of elements) {
    if (el.tagName.startsWith('h')) {
      const level = el.level || parseInt(el.tagName[1]);

      if (level === 1) {
        // 一级标题：保存之前的 BigChunk，开始新的
        if (currentBigChunk.trim()) {
          results.push(createBoundary(currentBigChunk, 'heading', currentHeadingPath, 1));
        }
        currentHeadingPath = [el.text];
        currentBigChunk = el.text + '\n\n';
        hasTopLevelHeading = true;
      } else {
        // 子标题：累积到当前 BigChunk
        currentBigChunk += el.text + '\n\n';
      }
    } else if (el.tagName === 'table') {
      // 表格累积到当前 BigChunk
      currentBigChunk += el.text + '\n\n';
    } else if (el.tagName === 'ul' || el.tagName === 'ol') {
      // 列表累积到当前 BigChunk
      currentBigChunk += el.text + '\n';
    } else if (el.tagName === 'p') {
      // 段落累积到当前 BigChunk
      currentBigChunk += el.text + '\n\n';
    }
  }

  // 保存最后的 BigChunk
  if (currentBigChunk.trim()) {
    results.push(createBoundary(currentBigChunk, 'heading', currentHeadingPath, 1));
  }

  // 无一级标题时，整文档作为一个 BigChunk
  if (!hasTopLevelHeading && results.length === 0 && html.trim()) {
    // 提取纯文本作为内容
    const plainText = stripHtmlTags(html);
    if (plainText.trim()) {
      results.push(createBoundary(plainText, 'paragraph', [], undefined));
    }
  }

  return results;
}

/**
 * 在 BigChunk 内识别二级标题边界，返回子标题段落列表
 * 用于 SmallChunk 切分参考
 */
export function extractSubHeadingsFromHtml(content: string): { text: string; headingPath: string[] }[] {
  // 如果是 HTML 格式，解析元素
  if (content.includes('<')) {
    const elements = parseHtmlElements(content);
    const results: { text: string; headingPath: string[] }[] = [];
    let currentSection = '';
    let currentSubHeadingPath: string[] = [];
    let hasSubHeading = false;

    for (const el of elements) {
      if (el.tagName.startsWith('h')) {
        const level = el.level || parseInt(el.tagName[1]);

        if (level === 2) {
          // 二级标题：保存之前的段落，开始新的
          if (currentSection.trim()) {
            results.push({ text: currentSection.trim(), headingPath: currentSubHeadingPath });
          }
          currentSubHeadingPath = [el.text];
          currentSection = el.text + '\n\n';
          hasSubHeading = true;
        } else if (level >= 3) {
          // 三级及以下：累积到当前段落
          currentSection += el.text + '\n\n';
          currentSubHeadingPath = updateHeadingPath(currentSubHeadingPath, el.text, level);
        } else if (level === 1) {
          // 一级标题：累积（可能以一级标题开头）
          currentSection += el.text + '\n\n';
        }
      } else if (el.tagName === 'table') {
        currentSection += el.text + '\n\n';
      } else if (el.tagName === 'ul' || el.tagName === 'ol') {
        currentSection += el.text + '\n';
      } else if (el.tagName === 'p') {
        currentSection += el.text + '\n\n';
      }
    }

    if (currentSection.trim()) {
      results.push({ text: currentSection.trim(), headingPath: currentSubHeadingPath });
    }

    if (!hasSubHeading && results.length === 0 && content.trim()) {
      results.push({ text: stripHtmlTags(content), headingPath: [] });
    }

    return results;
  }

  // 纯文本格式：尝试识别编号段落
  return extractSubHeadingsFromText(content);
}

/**
 * 从纯文本识别二级编号段落（如 1.1、2.1 等）
 */
function extractSubHeadingsFromText(content: string): { text: string; headingPath: string[] }[] {
  const lines = content.split('\n');
  const results: { text: string; headingPath: string[] }[] = [];
  let currentSection = '';
  let currentHeadingPath: string[] = [];
  let hasSubHeading = false;

  // 二级编号模式：1.1、2.1、1.1.1 等
  const subHeadingPattern = /^(\d+\.\d+[\.\d]*)\s+/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(subHeadingPattern);

    if (match) {
      // 找到二级编号段落
      if (currentSection.trim()) {
        results.push({ text: currentSection.trim(), headingPath: currentHeadingPath });
      }
      const headingNum = match[1];
      const headingText = trimmedLine;
      currentHeadingPath = [headingText];
      currentSection = headingText + '\n';
      hasSubHeading = true;
    } else {
      // 其他内容累积到当前段落
      currentSection += line + '\n';
    }
  }

  if (currentSection.trim()) {
    results.push({ text: currentSection.trim(), headingPath: currentHeadingPath });
  }

  // 无二级编号时，按段落切分
  if (!hasSubHeading && results.length === 0) {
    // 按双换行切分段落
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    for (const para of paragraphs) {
      results.push({ text: para.trim(), headingPath: [] });
    }
  }

  return results;
}