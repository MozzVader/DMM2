import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = context.site!.href.replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${site}/sitemap-index.xml`,
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}