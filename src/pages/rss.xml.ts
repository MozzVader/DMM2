import rss from '@astrojs/rss';
import { getAllPostsForPagination } from '../lib/supabase';
import type { APIContext } from 'astro';

const SITE_URL = 'https://mozvader.github.io';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();

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
        link: `${context.site!}DMM2/post/${post.slug}`,
      };
    }),
    customData: `<language>es-ar</language>
      <image>
        <url>${SITE_URL}/DMM2/favicon.svg</url>
        <title>Dos Minutos Más</title>
        <link>${SITE_URL}/DMM2</link>
      </image>`,
  });
}