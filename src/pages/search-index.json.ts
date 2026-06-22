import type { APIContext } from 'astro';
import { getAllPostsForPagination } from '../lib/supabase';

export async function GET(context: APIContext) {
  const posts = await getAllPostsForPagination();

  const index = posts.map(p => ({
    t: p.title,
    s: p.slug,
    e: p.excerpt || p.content.replace(/<[^>]*>/g, '').slice(0, 200),
    b: p.badge || 'General',
    bc: p.badge_color || 'purple',
    d: p.published_at,
    g: (p.tags || []).map(t => t.name),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}