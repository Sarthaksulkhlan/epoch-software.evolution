/**
 * Minimal Markdown → safe HTML renderer for the EPOCH evolution report.
 * Handles: headings (h1–h4), paragraphs, bold (**text**), inline code (`code`),
 * bullet lists, and GitHub-flavoured tables.
 * All text is HTML-escaped before insertion — nothing is ever injected raw.
 */

/** Escape a plain string so it is safe to embed in HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Apply inline markdown (bold, inline code) to an already-escaped string.
 *  We escape first then apply spans so the delimiters themselves cannot inject HTML. */
function inlineHtml(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // `inline code`
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'paragraph'; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({ kind: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Table: starts with |
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (l: string): string[] =>
          l
            .replace(/^\||\|$/g, '')
            .split('|')
            .map(c => c.trim());

        const headers = parseRow(tableLines[0]);
        const rows: string[][] = [];
        // Skip the separator row (row 1)
        for (let r = 2; r < tableLines.length; r++) {
          rows.push(parseRow(tableLines[r]));
        }
        blocks.push({ kind: 'table', headers, rows });
      }
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'bullet', items });
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const textLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('|')
    ) {
      textLines.push(lines[i]);
      i++;
    }
    if (textLines.length > 0) {
      blocks.push({ kind: 'paragraph', text: textLines.join(' ') });
    }
  }

  return blocks;
}

/** Convert a Markdown string to an HTML string. */
export function renderMarkdown(markdown: string): string {
  const blocks = parseBlocks(markdown);
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.kind === 'heading') {
      const tag = `h${block.level}`;
      parts.push(`<${tag}>${inlineHtml(block.text)}</${tag}>`);
    } else if (block.kind === 'paragraph') {
      parts.push(`<p>${inlineHtml(block.text)}</p>`);
    } else if (block.kind === 'bullet') {
      const items = block.items.map(item => `<li>${inlineHtml(item)}</li>`).join('');
      parts.push(`<ul>${items}</ul>`);
    } else if (block.kind === 'table') {
      const headerCells = block.headers.map(h => `<th>${inlineHtml(h)}</th>`).join('');
      const bodyRows = block.rows
        .map(row => {
          const cells = row.map(c => `<td>${inlineHtml(c)}</td>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      parts.push(`<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`);
    }
  }

  return parts.join('\n');
}
