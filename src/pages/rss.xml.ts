import rss from '@astrojs/rss';
import { getAllPostsForRSS } from '../lib/supabase';
import { sanitizeHTML } from '../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForRSS();
  const base = import.meta.env.BASE_URL || '/';

  return rss({
    title: 'Dos Minutos Más',
    description: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.published_at),
      description: post.excerpt || '',
      link: new URL(`${base}post/${post.slug}`, context.site!).href,
      content: post.featured_image
        ? `<img src="${post.featured_image}" alt="${post.title}" /><br/>${sanitizeHTML(post.content || '')}`
        : sanitizeHTML(post.content || ''),
    })),
    customData: '<language>es-ar</language>',
  });
}