import { describe, it, expect } from 'vitest';
import { escapeHtml, renderMarkdown } from '../../src/console/lib/markdown.js';

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('renderMarkdown', () => {
  it('renders an h1 heading', () => {
    const html = renderMarkdown('# Evolution Report');
    expect(html).toBe('<h1>Evolution Report</h1>');
  });

  it('renders an h2 heading', () => {
    const html = renderMarkdown('## Summary');
    expect(html).toBe('<h2>Summary</h2>');
  });

  it('renders a paragraph', () => {
    const html = renderMarkdown('Some plain text here.');
    expect(html).toBe('<p>Some plain text here.</p>');
  });

  it('renders bold inside a paragraph', () => {
    const html = renderMarkdown('A **bold** word.');
    expect(html).toBe('<p>A <strong>bold</strong> word.</p>');
  });

  it('renders inline code inside a paragraph', () => {
    const html = renderMarkdown('Run `pnpm report` now.');
    expect(html).toBe('<p>Run <code>pnpm report</code> now.</p>');
  });

  it('renders a bullet list', () => {
    const html = renderMarkdown('- first\n- second\n- third');
    expect(html).toBe('<ul><li>first</li><li>second</li><li>third</li></ul>');
  });

  it('renders a GFM table', () => {
    const md = [
      '| ID   | Status |',
      '| ---- | ------ |',
      '| M-01 | HOLD   |',
      '| M-02 | WEAK   |'
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>ID</th>');
    expect(html).toContain('<th>Status</th>');
    expect(html).toContain('<td>M-01</td>');
    expect(html).toContain('<td>HOLD</td>');
    expect(html).toContain('<td>M-02</td>');
    expect(html).toContain('<td>WEAK</td>');
  });

  it('escapes a <script> tag in a heading so it is never injected', () => {
    const html = renderMarkdown('# Hello <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;/script&gt;');
  });

  it('escapes a <script> tag in a paragraph', () => {
    const html = renderMarkdown('Click here <script>alert("xss")</script> now');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a <script> tag in a table cell', () => {
    const md = [
      '| Name              |',
      '| ----------------- |',
      '| <script>bad</script> |'
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a <script> tag in a bullet item', () => {
    const html = renderMarkdown('- <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('   \n\n  ')).toBe('');
  });
});
