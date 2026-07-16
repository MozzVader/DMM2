import rss from '@astrojs/rss';
import { getAllPostsForPagination } from '../lib/supabase';
import { stripHTML } from '../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();
  const base = import.meta.env.BASE_URL || '/';

  return rss({
    title: 'Dos Minutos Más',
    description: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.published_at),
      description: post.excerpt || stripHTML(post.content || '').slice(0, 300),
      link: new URL(`${base}post/${post.slug}`, context.site!).href,
    })),
    customData: '<language>es-ar</language>',
  });
}