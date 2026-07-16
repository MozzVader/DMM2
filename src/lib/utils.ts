/**
 * Shared utility functions used across components.
 */

/** Strip HTML tags and decode common HTML entities */
export function stripHTML(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Sanitize HTML content for safe rendering (build-time) */
import DOMPurify from 'isomorphic-dompurify';
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'img', 'figure', 'figcaption', 'video', 'iframe', 'small',
      'div', 'span', 'sub', 'sup', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
      'style', 'loading', 'width', 'height', 'data-img-align',
      'frameborder', 'allowfullscreen', 'colspan', 'rowspan',
      'data-raw', 'contenteditable',
    ],
  });
}

/** Format a date string for display (es-AR locale) */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const defaults: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return new Date(dateStr).toLocaleDateString('es-AR', options || defaults);
}

/** Estimate reading time from HTML content (~200 words/min for Spanish) */
export function readingTime(html?: string, wordCount?: number): number {
  if (wordCount && wordCount > 0) return Math.max(1, Math.ceil(wordCount / 200));
  const text = stripHTML(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}