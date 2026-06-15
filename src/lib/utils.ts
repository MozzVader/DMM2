/**
 * Shared utility functions used across components.
 */

/** Strip HTML tags and decode common HTML entities */
export function stripHTML(html: string): string {
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
      'img', 'figure', 'figcaption', 'video', 'iframe',
      'div', 'span', 'sub', 'sup', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
      'style', 'loading', 'width', 'height', 'data-img-align',
      'frameborder', 'allowfullscreen', 'colspan', 'rowspan',
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

/** Validate that a file is an accepted image type */
export function isValidImageType(file: File): boolean {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  return allowed.includes(file.type);
}

/** Validate file size (default max 5MB) */
export function isValidImageSize(file: File, maxMB: number = 5): boolean {
  return file.size <= maxMB * 1024 * 1024;
}