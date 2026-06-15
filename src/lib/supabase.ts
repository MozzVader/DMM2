import { createClient } from '@supabase/supabase-js';

const _supabaseUrl = import.meta.env.SUPABASE_URL;
const _supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!_supabaseUrl) {
  console.warn('[supabase] SUPABASE_URL is not set. All data fetches will return demo fallbacks.');
}

// Supabase createClient requires a valid URL string even if all fetches will fail to demo data
export const supabase = createClient(
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
  badge_color: 'purple' | 'red' | 'yellow' | 'green';
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
   FALLBACK DEMO DATA (used when Supabase is empty)
   ============================================== */

const DEMO_FEATURED: Post = {
  id: 'demo-1',
  slug: 'cosas-que-pasan-dos-minutos-mas',
  title: 'Cosas que pasan cuando te quedas dos minutos más en cualquier lado',
  excerpt: 'Siempre me pasa que cuando digo "voy dos minutitos más" termine quedándome una hora. Es una ley no escrita, como cuando decís "voy a dormir temprano" y son las tres de la mañana y todavía estás viendo videos de gatos cayéndose de cosas en YouTube.',
  content: '<p>Siempre me pasa que cuando digo "voy dos minutitos más" termine quedándome una hora. Es una ley no escrita, como cuando decís "voy a dormir temprano" y son las tres de la mañana y todavía estás viendo videos de gatos cayéndose de cosas en YouTube.</p><p>Lo mismo pasa en el asado. "Voy a dar una vuelta rápida por la parrilla" terminan siendo cuarenta minutos de contemplación existencial frente a las brasas mientras te preguntás si la vida tiene algún sentido o si el chorizo ya está listo.</p>',
  featured_image: null,
  badge: 'Destacado',
  badge_color: 'purple',
  is_featured: true,
  published_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-01-15T12:00:00Z',
  tags: [],
};

const DEMO_POSTS: Post[] = [
  {
    id: 'demo-2',
    slug: 'gente-que-habla-sola',
    title: 'La gente que habla sola en la calle ya no es tan rara como antes',
    excerpt: 'Antes si veías a alguien hablando solo en la calle, inmediatamente lo marcabas como persona con problemas. Hoy ves a un tipo con auriculares gritándole al aire y pensás "ah, está en un llamado".',
    content: '<p>Antes si veías a alguien hablando solo en la calle, inmediatamente lo marcabas como persona con problemas. Hoy ves a un tipo con auriculares gritándole al aire y pensás "ah, está en un llamado".</p>',
    featured_image: null,
    badge: 'Opinión',
    badge_color: 'red',
    is_featured: false,
    published_at: '2024-01-10T12:00:00Z',
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-10T12:00:00Z',
    tags: [],
  },
  {
    id: 'demo-3',
    slug: 'carteles-prohibido-estacionar',
    title: 'Por qué los carteles de "prohibido estacionar" son solo sugerencias decorativas',
    excerpt: 'Todo el mundo sabe que esos carteles son más una recomendación que una prohibición real.',
    content: '<p>Todo el mundo sabe que esos carteles son más una recomendación que una prohibición real.</p>',
    featured_image: null,
    badge: 'General',
    badge_color: 'purple',
    is_featured: false,
    published_at: '2024-01-05T12:00:00Z',
    created_at: '2024-01-05T12:00:00Z',
    updated_at: '2024-01-05T12:00:00Z',
    tags: [],
  },
  {
    id: 'demo-4',
    slug: 'asado-punto',
    title: 'El momento exacto en que el asado se pasa de punto',
    excerpt: 'Existe un instante, un segundo preciso, en el que el asado pasa de "perfecto" a "piedra".',
    content: '<p>Existe un instante, un segundo preciso, en el que el asado pasa de "perfecto" a "piedra".</p>',
    featured_image: null,
    badge: 'General',
    badge_color: 'red',
    is_featured: false,
    published_at: '2023-12-28T12:00:00Z',
    created_at: '2023-12-28T12:00:00Z',
    updated_at: '2023-12-28T12:00:00Z',
    tags: [],
  },
  {
    id: 'demo-5',
    slug: 'hacer-parecer-que-trabajaste',
    title: 'Cómo hacer que parezca que trabajaste todo el día',
    excerpt: 'Arte puro de la procrastinación profesional.',
    content: '<p>Arte puro de la procrastinación profesional.</p>',
    featured_image: null,
    badge: 'General',
    badge_color: 'yellow',
    is_featured: false,
    published_at: '2023-12-20T12:00:00Z',
    created_at: '2023-12-20T12:00:00Z',
    updated_at: '2023-12-20T12:00:00Z',
    tags: [],
  },
  {
    id: 'demo-6',
    slug: 'teoria-ya-voy',
    title: 'La teoría del "ya voy" y su relación con el tiempo relativo',
    excerpt: '"Ya voy" es la mentira piadosa más extendida del universo.',
    content: '<p>"Ya voy" es la mentira piadosa más extendida del universo.</p>',
    featured_image: null,
    badge: 'General',
    badge_color: 'green',
    is_featured: false,
    published_at: '2023-12-14T12:00:00Z',
    created_at: '2023-12-14T12:00:00Z',
    updated_at: '2023-12-14T12:00:00Z',
    tags: [],
  },
];

const DEMO_TAGS: Tag[] = [
  { id: 't1', name: 'Humor', slug: 'humor' },
  { id: 't2', name: 'Vida cotidiana', slug: 'vida-cotidiana' },
  { id: 't3', name: 'Buenos Aires', slug: 'buenos-aires' },
  { id: 't4', name: 'Observaciones', slug: 'observaciones' },
  { id: 't5', name: 'Procrastinación', slug: 'procrastinacion' },
  { id: 't6', name: 'Asado', slug: 'asado' },
  { id: 't7', name: 'Internet', slug: 'internet' },
  { id: 't8', name: 'Feriados', slug: 'feriados' },
  { id: 't9', name: 'Ansiedad', slug: 'ansiedad' },
  { id: 't10', name: 'YouTube', slug: 'youtube' },
  { id: 't11', name: 'Reflexiones', slug: 'reflexiones' },
  { id: 't12', name: 'Mates', slug: 'mates' },
];

const DEMO_ARCHIVE = [
  { year: 2024, count: 12 },
  { year: 2023, count: 48 },
  { year: 2022, count: 62 },
  { year: 2021, count: 55 },
  { year: 2020, count: 41 },
  { year: 2019, count: 38 },
  { year: 2018, count: 44 },
  { year: 2017, count: 52 },
  { year: 2016, count: 47 },
  { year: 2015, count: 39 },
];

/* ==============================================
   DATA FETCHING HELPERS (with fallback)
   ============================================== */

/** Normalize tags array — unwrap Supabase nested join + filter null entries */
function normalizeTags(tags: Tag[] | undefined): Tag[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map((t) => t?.tags || t)           // unwrap: Supabase nests as { tags: { name, slug } }
    .filter((t) => t && t.slug && t.name) as Tag[];
}

/** Get all published non-featured posts, newest first (scheduled posts excluded) */
export async function getAllPosts(): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .eq('is_featured', false)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (error) throw error;
    const posts = ((data as Post[]) || []).map((p) => ({
      ...p,
      tags: normalizeTags(p.tags),
    }));
    return posts;
  } catch {
    console.warn('[supabase] getAllPosts failed — using demo data');
    return DEMO_POSTS;
  }
}

/** Get all posts (featured + regular) for pagination, newest first (scheduled posts excluded) */
export async function getAllPostsForPagination(): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (error) throw error;
    return ((data as Post[]) || []).map((p) => ({
      ...p,
      tags: normalizeTags(p.tags),
    }));
  } catch {
    console.warn('[supabase] getAllPostsForPagination failed — using demo data');
    return [DEMO_FEATURED, ...DEMO_POSTS];
  }
}

/** Get the featured post (scheduled posts excluded) */
export async function getFeaturedPost(): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .eq('is_featured', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return { ...(data as Post), tags: normalizeTags((data as Post).tags) };
  } catch {
    console.warn('[supabase] getFeaturedPost failed — using demo data');
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
  } catch {
    console.warn('[supabase] getAllTags failed — using demo data');
    return DEMO_TAGS;
  }
}

/** Get posts by tag slug */
export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  try {
    // Step 1: Get tag ID from slug
    const { data: tag, error: tagErr } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', tagSlug)
      .single();

    if (tagErr || !tag) return [];

    // Step 2: Get post IDs from junction table
    const { data: relations, error: relErr } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('tag_id', tag.id);

    if (relErr) throw relErr;
    const postIds = (relations || []).map((r) => r.post_id);
    if (postIds.length === 0) return [];

    // Step 3: Fetch actual posts with their tags (scheduled posts excluded)
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .in('id', postIds)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (error) throw error;

    return ((data as Post[]) || []).map((p) => ({
      ...p,
      tags: normalizeTags(p.tags),
    }));
  } catch {
    console.warn(`[supabase] getPostsByTag("${tagSlug}") failed — using demo data`);
    return DEMO_POSTS;
  }
}

/** Get a single post by slug (allows scheduled posts so direct links work) */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) return null;
    return { ...(data as Post), tags: normalizeTags((data as Post).tags) };
  } catch {
    console.warn(`[supabase] getPostBySlug("${slug}") failed — looking in demo data`);
    return DEMO_POSTS.find(p => p.slug === slug) || DEMO_FEATURED;
  }
}

/** Get archive data grouped by year */
export async function getArchiveData(): Promise<{ year: number; count: number }[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('published_at');

    if (error) throw error;

    const years: Record<number, number> = {};
    (data || []).forEach((post: { published_at: string }) => {
      const year = new Date(post.published_at).getFullYear();
      years[year] = (years[year] || 0) + 1;
    });

    return Object.entries(years)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);
  } catch {
    console.warn('[supabase] getArchiveData failed — using demo data');
    return DEMO_ARCHIVE;
  }
}

/** Get all posts published in a given year (scheduled posts excluded) */
export async function getPostsByYear(year: number): Promise<Post[]> {
  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year + 1, 0, 1).toISOString();
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, tags:post_tags(tags(id, name, slug))')
      .gte('published_at', start)
      .lt('published_at', end)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (error) throw error;
    return ((data as Post[]) || []).map((p) => ({
      ...p,
      tags: normalizeTags(p.tags),
    }));
  } catch {
    console.warn(`[supabase] getPostsByYear(${year}) failed — using demo data`);
    return DEMO_POSTS;
  }
}
