import { createClient } from '@supabase/supabase-js';
import { DEMO_FEATURED, DEMO_POSTS, DEMO_TAGS, DEMO_ARCHIVE } from './demo-data';

const _supabaseUrl = import.meta.env.SUPABASE_URL;
const _supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!_supabaseUrl) {
  console.warn('[supabase] SUPABASE_URL is not set. All data fetches will return demo fallbacks.');
}

// Supabase createClient requires a valid URL string even if all fetches will fail to demo data
const supabase = createClient(
  _supabaseUrl || 'https://example.supabase.co',
  _supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.placeholder'
);

/* ==============================================
   TYPE DEFINITIONS
   ============================================== */

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  badge: string;
  badge_color: 'purple' | 'red' | 'yellow' | 'green' | 'cyan';
  is_featured: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  likes?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

/* ==============================================
   DATA FETCHING HELPERS (with fallback)
   ============================================== */

/** Normalize tags array — unwrap Supabase nested join + filter null entries */
function normalizeTags(tags: Tag[] | undefined): Tag[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map((t) => t?.tags || t)
    .filter((t) => t && t.slug && t.name) as Tag[];
}

/** Normalize a single post's tags */
function normalizePost(p: any): Post {
  return { ...p, tags: normalizeTags(p.tags) };
}

/** Columns to exclude when content is not needed (saves ~90% of egress per row) */
const LIGHT_SELECT = 'id, slug, title, excerpt, featured_image, badge, badge_color, is_featured, published_at, created_at, updated_at, likes, word_count, tags:post_tags(tags(id, name, slug))';

/** Base query: published, non-draft posts ordered newest first (full content) */
function basePostsQuery() {
  return supabase
    .from('posts')
    .select('*, tags:post_tags(tags(id, name, slug))')
    .eq('is_draft', false)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });
}

/** Base query: published, non-draft posts — NO content column */
function basePostsQueryLight() {
  return supabase
    .from('posts')
    .select(LIGHT_SELECT)
    .eq('is_draft', false)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });
}

/** Execute a posts query and normalize the array result */
async function fetchPosts(query: any): Promise<Post[]> {
  const { data, error } = await query;
  if (error) throw error;
  return ((data as Post[]) || []).map(normalizePost);
}

/** Get all published non-featured posts (full content) — only for individual post pages */
export async function getAllPosts(): Promise<Post[]> {
  try {
    return await fetchPosts(basePostsQuery().eq('is_featured', false));
  } catch (err) {
    console.warn('[supabase] getAllPosts failed — using demo data', err);
    return DEMO_POSTS;
  }
}

/** Get all published non-featured posts — NO content (for lists, prev/next, related) */
export async function getAllPostsLight(): Promise<Post[]> {
  try {
    return await fetchPosts(basePostsQueryLight().eq('is_featured', false));
  } catch (err) {
    console.warn('[supabase] getAllPostsLight failed — using demo data', err);
    return DEMO_POSTS.map(p => ({ ...p, content: '' }));
  }
}

/** Get all posts (featured + regular) for pagination, newest first — NO content */
export async function getAllPostsForPagination(): Promise<Post[]> {
  try {
    return await fetchPosts(basePostsQueryLight());
  } catch (err) {
    console.warn('[supabase] getAllPostsForPagination failed — using demo data', err);
    return [DEMO_FEATURED, ...DEMO_POSTS];
  }
}

/** Get museo posts (badge = 'Museo') for pagination, newest first — NO content */
export async function getMuseoPostsForPagination(): Promise<Post[]> {
  try {
    return await fetchPosts(basePostsQueryLight().eq('badge', 'Museo'));
  } catch (err) {
    console.warn('[supabase] getMuseoPostsForPagination failed — using demo data', err);
    return [];
  }
}

/** Get the featured post (newest) — NO content */
export async function getFeaturedPost(): Promise<Post | null> {
  try {
    const { data, error } = await basePostsQueryLight()
      .eq('is_featured', true)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return normalizePost(data);
  } catch (err) {
    console.warn('[supabase] getFeaturedPost failed — using demo data', err);
    return DEMO_FEATURED;
  }
}

/** Get all tags */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Tag[]) || [];
  } catch (err) {
    console.warn('[supabase] getAllTags failed — using demo data', err);
    return DEMO_TAGS;
  }
}

/** Get posts by tag slug.
 *
 *  Uses 3 sequential queries (tag → junction → posts). Supabase PostgREST
 *  does not support EXISTS sub-queries, and deep nested joins with !inner
 *  are fragile across Supabase versions. For a static blog with <200 posts
 *  these 3 queries complete in ~100ms total at build time — acceptable.
 */
export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  try {
    // Query 1: resolve tag slug → tag id
    const { data: tag, error: tagErr } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', tagSlug)
      .single();

    if (tagErr || !tag) return [];

    // Query 2: get post IDs from junction table
    const { data: relations, error: relErr } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('tag_id', tag.id);

    if (relErr) throw relErr;
    const postIds = (relations || []).map((r) => r.post_id);
    if (postIds.length === 0) return [];

    // Query 3: fetch posts with their tags — NO content (include featured posts in tag listings)
    return await fetchPosts(
      basePostsQueryLight().in('id', postIds)
    );
  } catch (err) {
    console.warn(`[supabase] getPostsByTag("${tagSlug}") failed — using demo data`, err);
    return DEMO_POSTS;
  }
}

/** Get archive data grouped by year (excludes scheduled posts) */
export async function getArchiveData(): Promise<{ year: number; count: number }[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('published_at')
      .eq('is_draft', false)
      .lte('published_at', new Date().toISOString());

    if (error) throw error;

    const years: Record<number, number> = {};
    (data || []).forEach((post: { published_at: string }) => {
      const year = new Date(post.published_at).getFullYear();
      years[year] = (years[year] || 0) + 1;
    });

    return Object.entries(years)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);
  } catch (err) {
    console.warn('[supabase] getArchiveData failed — using demo data', err);
    return DEMO_ARCHIVE;
  }
}

/** Get all posts published in a given year — NO content */
export async function getPostsByYear(year: number): Promise<Post[]> {
  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year + 1, 0, 1).toISOString();
  try {
    return await fetchPosts(basePostsQueryLight().gte('published_at', start).lt('published_at', end));
  } catch (err) {
    console.warn(`[supabase] getPostsByYear(${year}) failed — using demo data`, err);
    return DEMO_POSTS;
  }
}

/** Get a single post by slug — full content (the ONLY place that loads content at build time) */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const { data, error } = await basePostsQuery()
      .eq('slug', slug)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return normalizePost(data);
  } catch (err) {
    console.warn(`[supabase] getPostBySlug("${slug}") failed`, err);
    return null;
  }
}
