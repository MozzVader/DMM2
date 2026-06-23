import { getAllPostsForPagination } from '../../lib/supabase';

export async function GET() {
  const posts = await getAllPostsForPagination();
  const slugs = posts.map(p => ({ slug: p.slug }));
  return new Response(JSON.stringify(slugs), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
  });
}