import rss from '@astrojs/rss';
import { getAllPostsForPagination } from '../lib/supabase';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();
  const base = import.meta.env.BASE_URL || '/';

  return rss({
    title: 'Dos Minutos Más',
    description: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más.',
    site: context.site!,
    items: posts.map((post) => {
      const imgTag = post.featured_image
        ? `<p><img src="${post.featured_image}" alt="${post.title}" style="max-width:100%;height:auto;" /></p>`
        : '';
      const excerpt = post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 300);
      return {
        title: post.title,
        pubDate: new Date(post.published_at),
        description: excerpt,
        content: imgTag + post.content,
        link: new URL(`${base}post/${post.slug}`, context.site!).href,
      };
    }),
    customData: '<language>es-ar</language>',
  });
}