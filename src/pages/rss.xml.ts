import rss from '@astrojs/rss';
import { getAllPostsForPagination } from '../lib/supabase';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();

  return rss({
    title: 'Dos Minutos Más',
    description: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más.',
    site: context.site!,
    items: posts.map((post) => {
      const imgTag = post.featured_image
        ? `<p><img src="${post.featured_image}" alt="${post.title}" /></p>`
        : '';
      const cleanContent = post.content.replace(/<[^>]*>/g, '').slice(0, 300);
      const description = post.excerpt || cleanContent;
      return {
        title: post.title,
        pubDate: new Date(post.published_at),
        description,
        content: imgTag + `<p>${description}</p>`,
        link: `${context.site!}DMM2/post/${post.slug}`,
      };
    }),
    customData: '<language>es-ar</language>',
  });
}