import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';

describe('DOMPurify sanitization for PostPreview', () => {
  it('preserves safe formatting elements', () => {
    const html =
      '<p><strong>Bold</strong> <em>italic</em> <u>underline</u></p>' +
      '<ul><li>bullet</li></ul><ol><li>ordered</li></ol><br>';
    const result = DOMPurify.sanitize(html);
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<u>underline</u>');
    expect(result).toContain('<ul><li>bullet</li></ul>');
    expect(result).toContain('<ol><li>ordered</li></ol>');
    expect(result).toContain('<br>');
  });

  it('strips script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = DOMPurify.sanitize(html);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips event handler attributes', () => {
    const html = '<img src="x" onerror="alert(1)"><div onload="alert(2)">text</div>';
    const result = DOMPurify.sanitize(html);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
  });

  it('strips anchor tags with javascript: protocol', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = DOMPurify.sanitize(html);
    expect(result).not.toContain('javascript:');
  });

  it('strips data: protocol URLs', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    const result = DOMPurify.sanitize(html);
    expect(result).not.toContain('data:');
  });

  it('returns empty string for empty input', () => {
    expect(DOMPurify.sanitize('')).toBe('');
  });
});
