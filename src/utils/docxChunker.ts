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
  children?: HtmlElement[];
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
 * 注意：这是简化版本，复杂 HTML 可能需要用 DOMParser
 */
function parseHtmlElements(html: string): HtmlElement[] {
  const elements: HtmlElement[] = [];

  // 匹配标题标签
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = stripHtmlTags(match[2]);
    elements.push({ tagName: `h${level}`, text, innerHTML: match[0] });
  }

  // 匹配表格标签
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
  while ((match = tableRegex.exec(html)) !== null) {
    elements.push({ tagName: 'table', text: '', innerHTML: match[0] });
  }

  // 匹配列表标签
  const listRegex = /<(ul|ol)[^>]*>(.*?)<\/(ul|ol)>/gi;
  while ((match = listRegex.exec(html)) !== null) {
    const listType = match[1];
    const innerHTML = match[2];
    const text = parseListItemText(innerHTML, listType === 'ol');
    elements.push({ tagName: listType, text, innerHTML: match[0] });
  }

  // 匹配段落标签
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtmlTags(match[1]);
    // 排除已被识别为标题的段落
    if (text && !isHeadingParagraph(match[0], html)) {
      elements.push({ tagName: 'p', text });
    }
  }

  // 按出现顺序排序
  elements.sort((a, b) => {
    const aPos = html.indexOf(a.innerHTML || a.text);
    const bPos = html.indexOf(b.innerHTML || b.text);
    return aPos - bPos;
  });

  return elements;
}

/**
 * 判断段落是否是标题（已被 h 标签捕获）
 */
function isHeadingParagraph(pHTML: string, fullHTML: string): boolean {
  // 检查这个段落是否被包裹在标题标签中
  return false;
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
 * Word HTML 解析切分
 */
export function docxChunker(
  html: string,
  maxSize: number = 800
): BoundaryResult[] {
  const elements = parseHtmlElements(html);
  const results: BoundaryResult[] = [];
  let currentHeadingPath: string[] = [];
  let currentLevel = 0;
  let currentContent = '';
  let currentType: BoundaryType = 'paragraph';

  for (const el of elements) {
    switch (el.tagName) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        // 保存之前累积的内容
        if (currentContent.trim()) {
          results.push(createBoundary(currentContent, currentType, currentHeadingPath, currentLevel));
        }

        // 更新标题路径
        const level = parseInt(el.tagName[1]);
        currentLevel = level;
        currentHeadingPath = updateHeadingPath(currentHeadingPath, el.text, level);

        // 开始新的标题段落
        currentContent = el.text + '\n';
        currentType = 'heading';
        break;
      }

      case 'table': {
        // 表格独立成片
        const tableText = el.text || el.innerHTML || '';
        results.push(createBoundary(tableText, 'table', currentHeadingPath));
        break;
      }

      case 'ul': case 'ol': {
        // 列表独立成片
        results.push(createBoundary(el.text, 'list', currentHeadingPath));
        break;
      }

      case 'p': {
        // 段落累积到当前内容
        currentContent += el.text + '\n';
        break;
      }
    }
  }

  // 保存最后累积的内容
  if (currentContent.trim()) {
    results.push(createBoundary(currentContent, currentType, currentHeadingPath, currentLevel));
  }

  // 处理超长普通段落
  const finalResults: BoundaryResult[] = [];
  for (const r of results) {
    if (r.content.length > maxSize && r.boundaryType === 'paragraph') {
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
 * 按固定大小拆分
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