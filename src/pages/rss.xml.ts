import rss from '@astrojs/rss';
import { getAllPostsForPagination } from '../lib/supabase';
import { getStaticPaths as getBaseStaticPaths } from './posts/[...page].astro';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();

  return rss({
    title: 'Dos Minutos Más',
    description: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.published_at),
      description: post.excerpt || post.content.replace(/<[^>]*>/g, '').slice(0, 200),
      link: `${context.site!}DMM2/post/${post.slug}`,
    })),
    customData: '<language>es-ar</language>',
  });
}