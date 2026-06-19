const SUPABASE_URL = document.documentElement.dataset.sbUrl || '';
const SUPABASE_ANON_KEY = document.documentElement.dataset.sbKey || '';
const BUCKET = 'Dosminutosmas';
const BASE = '/DMM2';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STATE =====
let currentUser = null;
let allTags = [];
let editingPostId = null;
let editingIsDraft = false;
let currentFilter = 'all';
let allPosts = [];
let currentSection = 'posts';
let currentPage = 1;
const PAGE_SIZE = 30;
let selectedTags = new Set();
let quill = null;

// ===== HELPERS =====
function slugify(text) {
return text
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
}

function showToast(msg, type = 'success') {
const t = document.getElementById('toast');
t.textContent = msg;
t.className = `toast ${type} show`;
setTimeout(() => t.className = 'toast', 3000);
}

function formatDate(dateStr) {
return new Date(dateStr).toLocaleDateString('es-AR', {
  day: 'numeric', month: 'short', year: 'numeric'
});
}

function showScreen(screen) {
  const sidebar = document.getElementById('adminSidebar');

  if (screen === 'editor') {
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('statsScreen').classList.add('hidden');
    document.getElementById('editorScreen').classList.add('active');
    sidebar.classList.add('sidebar-hidden');
    const saveBtn = document.getElementById('savePostBtn');
    const draftBtn = document.getElementById('saveDraftBtn');
    if (editingIsDraft) {
      document.getElementById('editorTitle').textContent = 'Editar borrador';
      saveBtn.textContent = 'Publicar';
      draftBtn.style.display = '';
      draftBtn.textContent = 'Actualizar borrador';
    } else if (editingPostId) {
      document.getElementById('editorTitle').textContent = 'Editar post';
      saveBtn.textContent = 'Guardar post';
      draftBtn.style.display = '';
      draftBtn.textContent = 'Guardar borrador';
    } else {
      document.getElementById('editorTitle').textContent = 'Nuevo post';
      saveBtn.textContent = 'Guardar post';
      draftBtn.style.display = '';
      draftBtn.textContent = 'Guardar borrador';
    }
  } else {
    document.getElementById('editorScreen').classList.remove('active');
    sidebar.classList.remove('sidebar-hidden');
    currentSection = screen;
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === screen);
    });
    if (screen === 'posts') {
      document.getElementById('dashboardScreen').classList.remove('hidden');
      document.getElementById('statsScreen').classList.add('hidden');
    } else if (screen === 'stats') {
      document.getElementById('dashboardScreen').classList.add('hidden');
      document.getElementById('statsScreen').classList.remove('hidden');
      loadStats();
    }
  }
}

// ===== AUTH =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
e.preventDefault();
const email = document.getElementById('loginEmail').value;
const password = document.getElementById('loginPassword').value;
const errorEl = document.getElementById('loginError');

const { data, error } = await sb.auth.signInWithPassword({ email, password });

if (error) {
  errorEl.textContent = error.message;
  errorEl.style.display = 'block';
} else {
  currentUser = data.user;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminLayout').classList.add('active');
  loadDashboard();
}
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
await sb.auth.signOut();
location.reload();
});

// ===== DASHBOARD =====
async function loadDashboard() {
const tbody = document.getElementById('postsTableBody');
tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">Cargando...</td></tr>';

const { data: posts, error } = await sb
  .from('posts')
  .select('*')
  .order('published_at', { ascending: false });

if (error || !posts) {
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--danger);">Error al cargar posts</td></tr>';
  return;
}

allPosts = posts;
renderPosts();
}

function renderPosts() {
const tbody = document.getElementById('postsTableBody');
const paginationEl = document.getElementById('pagination');
let filtered = allPosts;

if (currentFilter === 'published') {
  filtered = allPosts.filter(p => !p.is_draft && new Date(p.published_at) <= new Date());
} else if (currentFilter === 'draft') {
  filtered = allPosts.filter(p => p.is_draft);
} else if (currentFilter === 'scheduled') {
  filtered = allPosts.filter(p => !p.is_draft && new Date(p.published_at) > new Date());
}

const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
if (currentPage > totalPages) currentPage = totalPages || 1;

if (filtered.length === 0) {
  const labels = { all: 'posts', published: 'posts publicados', draft: 'borradores', scheduled: 'posts programados' };
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">No hay ${labels[currentFilter]}</td></tr>`;
  paginationEl.innerHTML = '';
  return;
}

const start = (currentPage - 1) * PAGE_SIZE;
const pageItems = filtered.slice(start, start + PAGE_SIZE);

tbody.innerHTML = pageItems.map(post => {
  const isScheduled = !post.is_draft && new Date(post.published_at) > new Date();
  const isDraft = post.is_draft;
  const rowClass = isDraft ? 'draft-row' : (isScheduled ? 'scheduled-row' : '');
  let badge = '';
  if (isDraft) badge = ' <span class="draft-badge">Borrador</span>';
  else if (isScheduled) badge = ' <span class="scheduled-badge">Programado</span>';
  return `
  <tr class="${rowClass}">
    <td data-label="">${!isDraft && post.is_featured ? '<span class="featured-star">★</span>' : ''}</td>
    <td class="post-title-cell" data-label=""><a href="${BASE}/post/${post.slug}" target="_blank">${post.title}</a>${badge}</td>
    <td data-label="Badge"><span class="badge-sm ${post.badge_color || 'purple'}">${post.badge || 'General'}</span></td>
    <td class="date-cell" data-label="Fecha">${isDraft ? '—' : formatDate(post.published_at)}</td>
    <td class="actions-cell" data-label="">
      <button class="btn btn-sm" onclick="editPost('${post.id}')">Editar</button>
      <button class="btn btn-sm" onclick="clonePost('${post.id}')">Clonar</button>
      <button class="btn btn-sm btn-danger js-delete-btn" data-id="${post.id}" data-title="${post.title.replace(/"/g, '&quot;').replace(/</g, '&lt;')}">Eliminar</button>
    </td>
  </tr>`;
}).join('');

// Pagination controls
if (totalPages <= 1) {
  paginationEl.innerHTML = '';
  return;
}

const from = start + 1;
const to = Math.min(start + PAGE_SIZE, filtered.length);
paginationEl.innerHTML = `
  <button class="pagination-btn" id="pagPrev" ${currentPage === 1 ? 'disabled' : ''}>← Anterior</button>
  <span class="pagination-info">${from}–${to} de ${filtered.length}</span>
  <button class="pagination-btn" id="pagNext" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente →</button>`;

document.getElementById('pagPrev').addEventListener('click', () => { currentPage--; renderPosts(); });
document.getElementById('pagNext').addEventListener('click', () => { currentPage++; renderPosts(); });
}

// ===== FILTERS =====
document.getElementById('filterBar').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  currentPage = 1;
  renderPosts();
});

// ===== SIDEBAR NAVIGATION =====
document.getElementById('adminSidebar').addEventListener('click', (e) => {
  const tab = e.target.closest('.sidebar-tab');
  if (!tab || tab.classList.contains('active')) return;
  const section = tab.dataset.section;
  showScreen(section);
  if (section === 'posts') loadDashboard();
});

// ===== NEW POST =====
document.getElementById('newPostBtn').addEventListener('click', () => {
editingPostId = null;
editingIsDraft = false;
clearEditor();
loadTags();
loadTagsManager();
showScreen('editor');
loadDraft();
if (autoSaveInterval) clearInterval(autoSaveInterval);
autoSaveInterval = setInterval(saveDraft, 30000);
});

document.getElementById('backBtn').addEventListener('click', () => {
showScreen(currentSection);
if (currentSection === 'posts') loadDashboard();
if (currentSection === 'stats') loadStats();
if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
});

document.getElementById('cancelBtn').addEventListener('click', () => {
showScreen(currentSection);
if (currentSection === 'posts') loadDashboard();
if (currentSection === 'stats') loadStats();
if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
});

function clearEditor() {
document.getElementById('postTitle').value = '';
document.getElementById('postSlug').value = '';
document.getElementById('postBadge').value = 'General';
document.getElementById('postBadgeColor').value = 'purple';
document.getElementById('postImageUrl').value = '';
document.getElementById('postExcerpt').value = '';
document.getElementById('postDate').value = '';
document.getElementById('uploadPreview').innerHTML = '';
document.getElementById('removeImageBtn').style.display = 'none';
document.getElementById('toggleFeatured').classList.remove('active');
selectedTags.clear();
if (quill) quill.setContents([]);
if (htmlMode) document.getElementById('htmlToggleBtn').click();
}

// ===== TAGS =====
async function loadTags() {
const { data, error } = await sb.from('tags').select('*').order('name');
if (!error && data) {
  allTags = data;
}

const container = document.getElementById('tagsSelector');
container.innerHTML = allTags.map(tag => `
  <div class="tag-option ${selectedTags.has(tag.id) ? 'selected' : ''}" data-id="${tag.id}" onclick="toggleTag(this, '${tag.id}')">
    ${tag.name}
  </div>
`).join('');
}

function toggleTag(el, tagId) {
if (selectedTags.has(tagId)) {
  selectedTags.delete(tagId);
  el.classList.remove('selected');
} else {
  selectedTags.add(tagId);
  el.classList.add('selected');
}
}

// ===== SLUG AUTO-GENERATE =====
document.getElementById('postTitle').addEventListener('input', (e) => {
if (!editingPostId) {
  document.getElementById('postSlug').value = slugify(e.target.value);
}
});

// ===== FEATURED TOGGLE =====
document.getElementById('toggleFeatured').addEventListener('click', function() {
this.classList.toggle('active');
});

// ===== IMAGE UPLOAD =====
document.getElementById('uploadArea').addEventListener('click', () => {
document.getElementById('imageUpload').click();
});

document.getElementById('uploadArea').addEventListener('dragover', (e) => {
e.preventDefault();
e.currentTarget.style.borderColor = 'var(--neon-purple)';
});

document.getElementById('uploadArea').addEventListener('dragleave', () => {
document.getElementById('uploadArea').style.borderColor = '';
});

document.getElementById('uploadArea').addEventListener('drop', async (e) => {
e.preventDefault();
document.getElementById('uploadArea').style.borderColor = '';
const file = e.dataTransfer.files[0];
if (file) await uploadImage(file);
});

document.getElementById('imageUpload').addEventListener('change', async (e) => {
// Skip if this upload was triggered from Quill editor
if (e.target.getAttribute('data-for-quill')) return;
const file = e.target.files[0];
if (file) await uploadImage(file);
});

async function uploadImage(file) {
// Validate file type
var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
if (!allowedTypes.includes(file.type)) {
  showToast('Tipo de archivo no permitido. Usá JPG, PNG, WebP o GIF.', 'error');
  return;
}
// Validate file size (max 5MB)
if (file.size > 5 * 1024 * 1024) {
  showToast('La imagen supera los 5MB. Reducila antes de subir.', 'error');
  return;
}
showToast('Subiendo imagen...', 'success');
const ext = file.name.split('.').pop();
const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

// Reset input so same file can be selected again
document.getElementById('imageUpload').value = '';

const { data, error } = await sb.storage
  .from(BUCKET)
  .upload(filename, file, { cacheControl: '31536000', upsert: false });

if (error) {
  showToast('Error al subir: ' + error.message, 'error');
  return;
}

const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(data.path);
document.getElementById('postImageUrl').value = publicUrl;
document.getElementById('uploadPreview').innerHTML = `<img src="${publicUrl}" alt="Preview" />`;
showImageControls(true);
showToast('Imagen subida correctamente');
}

document.getElementById('setImageBtn').addEventListener('click', () => {
const url = document.getElementById('postImageUrl').value;
if (url) {
  document.getElementById('uploadPreview').innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<p style=color:var(--danger)>No se pudo cargar la imagen</p>'" />`;
  document.getElementById('removeImageBtn').style.display = 'inline-block';
}
});

// ===== REMOVE IMAGE =====
function showImageControls(hasImage) {
document.getElementById('removeImageBtn').style.display = hasImage ? 'inline-block' : 'none';
}

document.getElementById('removeImageBtn').addEventListener('click', () => {
// Delete from bucket if it's a Supabase Storage URL
const url = document.getElementById('postImageUrl').value;
if (url && url.includes(SUPABASE_URL)) {
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1].split('?')[0];
  sb.storage.from(BUCKET).remove([filename]);
}
document.getElementById('postImageUrl').value = '';
document.getElementById('uploadPreview').innerHTML = '';
showImageControls(false);
showToast('Imagen eliminada');
});

// ===== SAVE POST =====
document.getElementById('savePostBtn').addEventListener('click', async () => {
const title = document.getElementById('postTitle').value.trim();
const slug = document.getElementById('postSlug').value.trim();
const badge = document.getElementById('postBadge').value;
const badge_color = document.getElementById('postBadgeColor').value;
const is_featured = document.getElementById('toggleFeatured').classList.contains('active');
const featured_image = document.getElementById('postImageUrl').value.trim() || null;
const excerpt = document.getElementById('postExcerpt').value.trim() || null;
const content = getContent();
const dateInput = document.getElementById('postDate').value;
const published_at = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();

if (!title) { showToast('El título es obligatorio', 'error'); return; }
if (!slug) { showToast('El slug es obligatorio', 'error'); return; }

const btn = document.getElementById('savePostBtn');
btn.disabled = true;
btn.textContent = 'Guardando...';

try {
  if (editingPostId) {
    if (editingIsDraft) {
      // PUBLISH DRAFT → becomes a real post (auto-featured)
      await sb.from('posts').update({ is_featured: false }).eq('is_featured', true);
      const { error } = await sb.from('posts').update({
        title, slug, badge, badge_color, is_featured: true, featured_image, excerpt, content,
        published_at: new Date().toISOString(), is_draft: false, updated_at: new Date().toISOString()
      }).eq('id', editingPostId);
      if (error) throw error;
      await sb.from('post_tags').delete().eq('post_id', editingPostId);
      for (const tagId of selectedTags) {
        await sb.from('post_tags').insert({ post_id: editingPostId, tag_id: tagId });
      }
      showToast('Borrador publicado correctamente');
    } else {
      // UPDATE existing post
      const { error } = await sb.from('posts').update({
        title, slug, badge, badge_color, is_featured, featured_image, excerpt, content, published_at,
        updated_at: new Date().toISOString()
      }).eq('id', editingPostId);
      if (error) throw error;
      await sb.from('post_tags').delete().eq('post_id', editingPostId);
      for (const tagId of selectedTags) {
        await sb.from('post_tags').insert({ post_id: editingPostId, tag_id: tagId });
      }
      showToast('Post actualizado correctamente');
    }
  } else {
    // INSERT — new post automatically becomes featured
    await sb.from('posts').update({ is_featured: false }).eq('is_featured', true);
    const { data: newPost, error } = await sb.from('posts').insert({
      title, slug, badge, badge_color, is_featured: true, is_draft: false, featured_image, excerpt, content, published_at
    }).select().single();
    if (error) throw error;
    for (const tagId of selectedTags) {
      await sb.from('post_tags').insert({ post_id: newPost.id, tag_id: tagId });
    }
    showToast('Post creado correctamente');
  }

  showScreen('dashboard');
  loadDashboard();
  loadTagsManager();
  clearDraft();
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
} catch (err) {
  showToast('Error: ' + err.message, 'error');
} finally {
  btn.disabled = false;
  btn.textContent = editingIsDraft ? 'Publicar' : 'Guardar post';
}
});

// ===== SAVE DRAFT =====
document.getElementById('saveDraftBtn').addEventListener('click', async () => {
const title = document.getElementById('postTitle').value.trim();
const slug = document.getElementById('postSlug').value.trim();
const badge = document.getElementById('postBadge').value;
const badge_color = document.getElementById('postBadgeColor').value;
const featured_image = document.getElementById('postImageUrl').value.trim() || null;
const excerpt = document.getElementById('postExcerpt').value.trim() || null;
const content = getContent();

if (!title) { showToast('El título es obligatorio para guardar borrador', 'error'); return; }
const finalSlug = slug || slugify(title);

const btn = document.getElementById('saveDraftBtn');
btn.disabled = true;
btn.textContent = 'Guardando...';

try {
  if (editingPostId && editingIsDraft) {
    // UPDATE existing draft
    const { error } = await sb.from('posts').update({
      title, slug: finalSlug, badge, badge_color, featured_image, excerpt, content,
      updated_at: new Date().toISOString()
    }).eq('id', editingPostId);
    if (error) throw error;
    await sb.from('post_tags').delete().eq('post_id', editingPostId);
    for (const tagId of selectedTags) {
      await sb.from('post_tags').insert({ post_id: editingPostId, tag_id: tagId });
    }
    showToast('Borrador actualizado');
  } else {
    // INSERT new draft
    const { data: newPost, error } = await sb.from('posts').insert({
      title, slug: finalSlug, badge, badge_color, is_featured: false, is_draft: true,
      featured_image, excerpt, content, published_at: null
    }).select().single();
    if (error) throw error;
    for (const tagId of selectedTags) {
      await sb.from('post_tags').insert({ post_id: newPost.id, tag_id: tagId });
    }
    showToast('Borrador guardado');
  }

  showScreen('dashboard');
  loadDashboard();
  loadTagsManager();
  clearDraft();
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
} catch (err) {
  showToast('Error: ' + err.message, 'error');
} finally {
  btn.disabled = false;
  btn.textContent = 'Guardar borrador';
}
});

// ===== EDIT POST =====
async function editPost(id) {
editingPostId = id;
clearEditor();

const { data: post, error } = await sb.from('posts').select('*').eq('id', id).single();
if (error) { showToast('Error al cargar el post', 'error'); return; }

editingIsDraft = !!post.is_draft;

document.getElementById('postTitle').value = post.title;
document.getElementById('postSlug').value = post.slug;
document.getElementById('postBadge').value = post.badge;
document.getElementById('postBadgeColor').value = post.badge_color;
document.getElementById('postImageUrl').value = post.featured_image || '';
document.getElementById('postExcerpt').value = post.excerpt || '';

// Set date
if (post.published_at) {
  const d = new Date(post.published_at);
  // Format for datetime-local: YYYY-MM-DDTHH:MM
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('postDate').value =
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

if (post.is_featured) {
  document.getElementById('toggleFeatured').classList.add('active');
}

if (post.featured_image) {
  document.getElementById('uploadPreview').innerHTML = `<img src="${post.featured_image}" alt="Preview" onerror="this.parentElement.innerHTML=''" />`;
  showImageControls(true);
} else {
  showImageControls(false);
}

if (quill) {
    quill.setText('');
    quill.clipboard.dangerouslyPasteHTML(0, post.content || '', 'html');
    restoreImageAlignments(post.content || '');
  }

// Load post tags
const { data: postTags } = await sb.from('post_tags').select('tag_id').eq('post_id', id);
if (postTags) {
  selectedTags = new Set(postTags.map(t => t.tag_id));
}

await loadTags();
loadTagsManager();
showScreen('editor');
clearDraft();
if (autoSaveInterval) clearInterval(autoSaveInterval);
autoSaveInterval = setInterval(saveDraft, 30000);
}

// ===== CLONE POST =====
async function clonePost(id) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const { data: post, error } = await sb.from('posts').select('*').eq('id', id).single();
    if (error) throw error;

    const { data: cloned, error: cloneErr } = await sb.from('posts').insert({
      title: post.title + ' (copia)',
      slug: post.slug + '-copia',
      badge: post.badge,
      badge_color: post.badge_color,
      is_featured: false,
      is_draft: true,
      published_at: null,
      excerpt: post.excerpt,
      content: post.content
    }).select().single();

    if (cloneErr) throw cloneErr;

    // Clone tags
    const { data: postTags } = await sb.from('post_tags').select('tag_id').eq('post_id', id);
    if (postTags) {
      for (const t of postTags) {
        await sb.from('post_tags').insert({ post_id: cloned.id, tag_id: t.tag_id });
      }
    }

    showToast('Borrador creado — editá el título, slug e imagen antes de publicar');
    loadDashboard();
  } catch (err) {
    showToast('Error al clonar: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Clonar';
  }
}

// ===== DELETE POST =====
let deleteTargetId = null;

function confirmDelete(id, title) {
deleteTargetId = id;
document.getElementById('confirmMsg').textContent = `¿Eliminás "${title}"? Esta acción no se puede deshacer.`;
document.getElementById('confirmOverlay').classList.add('active');
}

document.getElementById('confirmCancel').addEventListener('click', () => {
document.getElementById('confirmOverlay').classList.remove('active');
deleteTargetId = null;
});

// Event delegation for delete buttons (avoids inline onclick with user-generated titles)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-delete-btn');
  if (btn) confirmDelete(btn.dataset.id, btn.dataset.title);
});

document.getElementById('confirmOk').addEventListener('click', async () => {
if (!deleteTargetId) return;

// Get post data to find and delete its image from bucket
const { data: post } = await sb.from('posts').select('featured_image').eq('id', deleteTargetId).single();
if (post?.featured_image) {
  // Extract filename from URL: .../object/bucket/filename
  const urlParts = post.featured_image.split('/');
  const filename = urlParts[urlParts.length - 1];
  // Remove query params if any
  const cleanFilename = filename.split('?')[0];
  await sb.storage.from(BUCKET).remove([cleanFilename]);
}

// Delete post_tags first
await sb.from('post_tags').delete().eq('post_id', deleteTargetId);
// Delete post
const { error } = await sb.from('posts').delete().eq('id', deleteTargetId);

if (error) {
  showToast('Error al eliminar: ' + error.message, 'error');
} else {
  showToast('Post eliminado');
  loadDashboard();
}

document.getElementById('confirmOverlay').classList.remove('active');
deleteTargetId = null;
});

// ===== TAGS MANAGER =====
async function loadTagsManager() {
const { data: tags, error } = await sb.from('tags').select('*').order('name');
if (error || !tags) return;

const container = document.getElementById('tagsList');
container.innerHTML = tags.map(tag => `
  <div class="tags-list-item">
    <span>${tag.name}</span>
    <span class="tag-slug">${tag.slug}</span>
    <button class="tag-delete" onclick="deleteTag('${tag.id}', '${tag.name}')" title="Eliminar tag">×</button>
  </div>
`).join('');
}

document.getElementById('addTagBtn').addEventListener('click', async () => {
const name = document.getElementById('newTagName').value.trim();
if (!name) { showToast('Ingresá un nombre para el tag', 'error'); return; }

const slug = slugify(name);
const { data, error } = await sb.from('tags').insert({ name, slug }).select().single();

if (error) {
  showToast('Error: ' + error.message, 'error');
} else {
  showToast(`Tag "${name}" creado`);
  document.getElementById('newTagName').value = '';
  loadTagsManager();
  loadTags();
}
});

document.getElementById('newTagName').addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
  e.preventDefault();
  document.getElementById('addTagBtn').click();
}
});

async function deleteTag(id, name) {
deleteTargetId = null;
document.getElementById('confirmMsg').textContent = '¿Eliminás el tag "' + name + '"? Esta acción no se puede deshacer y se desvinculará de todos los posts.';
document.getElementById('confirmOverlay').classList.add('active');
document.getElementById('confirmOk').onclick = async function() {
  document.getElementById('confirmOverlay').classList.remove('active');
  await sb.from('post_tags').delete().eq('tag_id', id);
  const { error } = await sb.from('tags').delete().eq('id', id);
  if (error) {
    showToast('Error al eliminar: ' + error.message, 'error');
    return;
  }
  showToast('Tag "' + name + '" eliminado');
  loadTagsManager();
  loadTags();
};
}

// ===== STATS DASHBOARD =====
let chartMonthlyPostsInst = null;
let chartMonthlyLikesInst = null;
let chartCategoriesInst = null;

async function loadStats() {
  if (allPosts.length === 0) return;
  const published = allPosts.filter(p => !p.is_draft);
  if (published.length === 0) return;

  // KPIs
  const totalPosts = published.length;
  const totalLikes = published.reduce((s, p) => s + (p.likes || 0), 0);
  const avgLikes = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : '0';
  document.getElementById('kpiTotalPosts').textContent = totalPosts;
  document.getElementById('kpiTotalLikes').textContent = totalLikes;
  document.getElementById('kpiRatio').textContent = avgLikes + ' likes/post';

  const byDate = [...published].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const lastDate = new Date(byDate[0].published_at);
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  document.getElementById('kpiLastPost').textContent =
    daysSince === 0 ? 'Hoy' : daysSince === 1 ? 'Ayer' : 'Hace ' + daysSince + ' días';

  const wc = published.map(p => {
    const t = (p.content || '').replace(/<[^>]*>/g, '').trim();
    return t ? t.split(/\s+/).length : 0;
  });
  document.getElementById('kpiAvgWords').textContent =
    Math.round(wc.reduce((a, b) => a + b, 0) / totalPosts).toLocaleString('es-AR');

  const datesAsc = [...published]
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
    .map(p => new Date(p.published_at).getTime());
  if (datesAsc.length >= 2) {
    let totalDays = 0;
    for (let i = 1; i < datesAsc.length; i++) {
      totalDays += (datesAsc[i] - datesAsc[i - 1]) / 86400000;
    }
    document.getElementById('kpiCadencia').textContent = (totalDays / (datesAsc.length - 1)).toFixed(1);
  }

  // Monthly data
  const monthMap = {}, likesMap = {};
  published.forEach(p => {
    const d = new Date(p.published_at);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthMap[key] = (monthMap[key] || 0) + 1;
    likesMap[key] = (likesMap[key] || 0) + (p.likes || 0);
  });
  const mKeys = Object.keys(monthMap).sort();
  const mLabels = mKeys.map(k => {
    const [y, m] = k.split('-');
    return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m) - 1] + ' ' + y.slice(2);
  });

  if (chartMonthlyPostsInst) chartMonthlyPostsInst.destroy();
  if (chartMonthlyLikesInst) chartMonthlyLikesInst.destroy();
  if (chartCategoriesInst) chartCategoriesInst.destroy();

  Chart.defaults.color = '#888';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  chartMonthlyPostsInst = new Chart(document.getElementById('chartMonthlyPosts'), {
    type: 'bar',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Posts', data: mKeys.map(k => monthMap[k]),
        backgroundColor: 'rgba(191, 90, 242, 0.6)', borderColor: 'rgba(191, 90, 242, 1)',
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { ticks: { maxRotation: 45, minRotation: 0 } } }
    }
  });

  chartMonthlyLikesInst = new Chart(document.getElementById('chartMonthlyLikes'), {
    type: 'line',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Likes', data: mKeys.map(k => likesMap[k] || 0),
        borderColor: 'rgba(255, 71, 87, 1)', backgroundColor: 'rgba(255, 71, 87, 0.1)',
        fill: true, tension: 0.3, pointBackgroundColor: 'rgba(255, 71, 87, 1)', pointRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  const catMap = {};
  published.forEach(p => { const c = p.badge || 'General'; catMap[c] = (catMap[c] || 0) + 1; });
  const catLabels = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);
  const palette = [
    'rgba(191,90,242,0.8)', 'rgba(255,71,87,0.8)', 'rgba(255,211,42,0.8)',
    'rgba(46,213,115,0.8)', 'rgba(34,211,238,0.8)', 'rgba(255,159,67,0.8)'
  ];

  chartCategoriesInst = new Chart(document.getElementById('chartCategories'), {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catLabels.map(k => catMap[k]),
        backgroundColor: palette.slice(0, catLabels.length),
        borderColor: '#131313', borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } } }
    }
  });

  // Tag/Likes correlation
  try {
    const { data: postTags } = await sb.from('post_tags').select('post_id, tag_id');
    const { data: tags } = await sb.from('tags').select('*');
    if (postTags && tags && postTags.length > 0) {
      const tMap = {}; tags.forEach(t => tMap[t.id] = t.name);
      const tLikes = {}, tCounts = {};
      postTags.forEach(pt => {
        const post = published.find(p => p.id === pt.post_id);
        if (post && tMap[pt.tag_id]) {
          const n = tMap[pt.tag_id];
          tLikes[n] = (tLikes[n] || 0) + (post.likes || 0);
          tCounts[n] = (tCounts[n] || 0) + 1;
        }
      });
      const corr = Object.entries(tLikes)
        .map(([name, total]) => ({ name, avg: (total / tCounts[name]).toFixed(1), count: tCounts[name] }))
        .sort((a, b) => b.avg - a.avg);
      document.getElementById('tagLikesTable').innerHTML = corr.length === 0
        ? '<p style="color:var(--text-muted);font-size:0.85rem;">Sin datos de tags</p>'
        : corr.map(t => `<div class="tag-likes-row"><div><span class="tag-likes-name">${t.name}</span> <span class="tag-likes-posts">(${t.count} posts)</span></div><span class="tag-likes-avg">${t.avg} ★</span></div>`).join('');
    }
  } catch(e) {
    document.getElementById('tagLikesTable').innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Error al cargar tags</p>';
  }

  // Top 5 posts
  const top5 = [...published].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
  document.getElementById('topPostsBody').innerHTML = top5.map((p, i) =>
    `<tr><td class="rank">${i + 1}</td><td><a href="${BASE}/post/${p.slug}" target="_blank" class="post-link">${p.title}</a></td><td class="likes-count">${p.likes || 0} ★</td><td style="color:var(--text-secondary);font-size:0.8rem;">${formatDate(p.published_at)}</td></tr>`
  ).join('');
}

// ===== AUTO-SAVE TO LOCALSTORAGE =====
function saveDraft() {
const draft = {
  title: document.getElementById('postTitle').value,
  slug: document.getElementById('postSlug').value,
  badge: document.getElementById('postBadge').value,
  badge_color: document.getElementById('postBadgeColor').value,
  image: document.getElementById('postImageUrl').value,
  excerpt: document.getElementById('postExcerpt').value,
  date: document.getElementById('postDate').value,
  content: getContent(),
  tags: Array.from(selectedTags),
  featured: document.getElementById('toggleFeatured').classList.contains('active'),
  savedAt: new Date().toISOString()
};
localStorage.setItem('dmm_draft', JSON.stringify(draft));
}

function loadDraft() {
const raw = localStorage.getItem('dmm_draft');
if (!raw) return false;
try {
  const draft = JSON.parse(raw);
  document.getElementById('postTitle').value = draft.title || '';
  document.getElementById('postSlug').value = draft.slug || '';
  document.getElementById('postBadge').value = draft.badge || 'General';
  document.getElementById('postBadgeColor').value = draft.badge_color || 'purple';
  document.getElementById('postImageUrl').value = draft.image || '';
  document.getElementById('postExcerpt').value = draft.excerpt || '';
  document.getElementById('postDate').value = draft.date || '';
  if (draft.content && quill) {
    quill.setText('');
    quill.clipboard.dangerouslyPasteHTML(0, draft.content, 'html');
    restoreImageAlignments(draft.content);
  }
  selectedTags = new Set(draft.tags || []);
  if (draft.featured) document.getElementById('toggleFeatured').classList.add('active');
  if (draft.savedAt) showToast('Draft restaurado (' + new Date(draft.savedAt).toLocaleTimeString('es-AR') + ')');
  return true;
} catch(e) { return false; }
}

function clearDraft() {
localStorage.removeItem('dmm_draft');
}

// Auto-save every 30 seconds when in editor
var autoSaveInterval = null;
let htmlMode = false;

function getContent() {
  if (htmlMode) return document.getElementById('htmlEditor').value;
  if (!quill) return '';
  // Extract raw HTML from snippet blots (remove ql-raw-html wrappers)
  const clone = quill.root.cloneNode(true);
  clone.querySelectorAll('.ql-raw-html').forEach(node => {
    const raw = node.getAttribute('data-raw');
    if (raw) {
      const tmp = document.createElement('div');
      tmp.innerHTML = raw;
      node.replaceWith(...tmp.childNodes);
    }
  });
  return clone.innerHTML;
}

/** Restore image data-img-align after dangerouslyPasteHTML strips it */
function restoreImageAlignments(originalHtml) {
  const tmp = document.createElement('div');
  tmp.innerHTML = originalHtml;
  const alignMap = new Map();
  tmp.querySelectorAll('img[data-img-align]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      alignMap.set(src, {
        align: img.getAttribute('data-img-align'),
        style: img.getAttribute('style') || ''
      });
    }
  });
  quill.root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    const info = alignMap.get(src);
    if (info) {
      img.setAttribute('data-img-align', info.align);
      if (info.style) img.setAttribute('style', info.style);
    }
  });
}

function formatHTML(html) {
  return html
    .replace(/<\/(p|h[1-6]|div|ul|ol|li|blockquote|pre|figure|figcaption)>/gi, '$&\n')
    .replace(/<(p|h[1-6]|div|ul|ol|li|blockquote|pre|figure|figcaption)[\s>]/gi, '\n$&')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// ===== HTML TOGGLE =====
document.getElementById('htmlToggleBtn').addEventListener('click', () => {
  htmlMode = !htmlMode;
  const editorEl = document.getElementById('editor-container');
  const htmlEl = document.getElementById('htmlEditor');
  const btn = document.getElementById('htmlToggleBtn');

  if (htmlMode) {
    // Visual -> HTML: unwrap ql-raw-html blocks so user sees original snippet HTML
    const clone = quill.root.cloneNode(true);
    clone.querySelectorAll('.ql-raw-html').forEach(node => {
      const raw = node.getAttribute('data-raw');
      if (raw) {
        const tmp = document.createElement('div');
        tmp.innerHTML = raw;
        node.replaceWith(...tmp.childNodes);
      }
    });
    htmlEl.value = formatHTML(clone.innerHTML);
    editorEl.style.display = 'none';
    htmlEl.style.display = '';
    btn.classList.add('active');
    btn.textContent = 'Visual';
  } else {
    // HTML -> Visual: use dangerouslyPasteHTML so clipboard matchers fire
    const html = htmlEl.value.replace(/>\s*\n\s*</g, '><');
    quill.setText('');
    quill.clipboard.dangerouslyPasteHTML(0, html, 'html');
    restoreImageAlignments(html);
    htmlEl.style.display = 'none';
    editorEl.style.display = '';
    btn.classList.remove('active');
    btn.textContent = 'HTML';
  }
});

// ===== QUILL: RAW HTML BLOT (preserves snippet blocks) =====
const BlockEmbed = Quill.import('blots/block/embed');
class RawHtmlBlot extends BlockEmbed {
  static create(html) {
    const node = super.create();
    node.innerHTML = html;
    node.setAttribute('data-raw', html);
    node.setAttribute('contenteditable', 'false');
    return node;
  }
  static value(node) {
    return node.getAttribute('data-raw') || node.innerHTML;
  }
}
RawHtmlBlot.blotName = 'raw-html';
RawHtmlBlot.tagName = 'div';
RawHtmlBlot.className = 'ql-raw-html';
Quill.register(RawHtmlBlot);

// ===== QUILL: SMALL TEXT BLOT =====
const SmallBlot = Quill.import('blots/inline');
class SmallTextBlot extends SmallBlot {
  static create() { return super.create('small'); }
  static formats() { return true; }
}
SmallTextBlot.blotName = 'small';
SmallTextBlot.tagName = 'small';
Quill.register(SmallTextBlot);

// ===== QUILL: BRIGHT TEXT BLOT =====
const BrightBlot = Quill.import('blots/inline');
class BrightTextBlot extends BrightBlot {
  static create() {
    const node = super.create('span');
    node.classList.add('ql-bright');
    return node;
  }
  static formats(node) {
    return node.classList.contains('ql-bright');
  }
}
BrightTextBlot.blotName = 'bright';
BrightTextBlot.tagName = 'span';
Quill.register(BrightTextBlot);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
// Register QuillBlotFormatter (blot-formatter2)
Quill.register('modules/blotFormatter', QuillBlotFormatter2.default);

quill = new Quill('#editor-container', {
  theme: 'snow',
  placeholder: 'Escribí el contenido del post...',
  modules: {
    blotFormatter: {
      overlay: {
        style: { position: 'absolute', border: '2px solid var(--neon-purple)', background: 'rgba(191,90,242,0.08)' }
      }
    },
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike', 'small', 'bright'],
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: function() {
          // Directly trigger file upload — user activation is preserved
          const fileInput = document.getElementById('imageUpload');
          fileInput.setAttribute('data-for-quill', 'true');
          fileInput.click();
        }
      }
    }
  }
});

// ===== CLIPBOARD MATCHER: preserve snippet blocks =====
const Delta = Quill.import('delta');
const SNIPPET_CLASSES = ['museum-card', 'blog-timeline'];
quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
  if (node.nodeType !== 1) return delta;
  for (const cls of SNIPPET_CLASSES) {
    if (node.classList && node.classList.contains(cls)) {
      return new Delta().insert({ 'raw-html': node.outerHTML }, quill.getFormat());
    }
  }
  return delta;
});

// ===== TRACK CLICKED IMAGE =====
let _selectedImg = null;
const editorEl = document.querySelector('#editor-container .ql-editor');
if (editorEl) {
  // Use mousedown because BlotFormatter intercepts clicks on images
  editorEl.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'IMG' && editorEl.contains(e.target)) {
      _selectedImg = e.target;
    }
  });
}

// ===== IMAGE URL MODAL =====
const imgUrlOverlay = document.getElementById('imgUrlModalOverlay');
const imgUrlInput = document.getElementById('imgUrlInput');

// Add custom buttons: image URL insert + image alignment group
const toolbar = document.querySelector('.ql-toolbar');
if (toolbar) {
  // --- URL image button ---
  const urlBtn = document.createElement('button');
  urlBtn.className = 'ql-custom-image-url';
  urlBtn.setAttribute('title', 'Insertar imagen por URL');
  urlBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="2" d="M3.5 7.5c2-3 6-3 8 0s6 3 8 0M3.5 12.5c2-3 6-3 8 0s6 3 8 0M3.5 17.5c2-3 6-3 8 0s6 3 8 0" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const imgBtn = toolbar.querySelector('.ql-image');
  if (imgBtn && imgBtn.parentNode) {
    imgBtn.parentNode.insertBefore(urlBtn, imgBtn.nextSibling);
  }
  urlBtn.addEventListener('click', () => {
    imgUrlOverlay.classList.add('active');
    imgUrlInput.value = '';
    setTimeout(() => imgUrlInput.focus(), 100);
  });

  // --- Image alignment group ---
  const alignGroup = document.createElement('span');
  alignGroup.className = 'ql-custom-img-align-group';

  const alignDefs = [
    { cls: 'ql-img-align-left', title: 'Imagen a la izquierda (texto envuelve)', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="1" y="3" width="8" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="1" y="14" width="8" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="12" y="5" width="11" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' },
    { cls: 'ql-img-align-center', title: 'Imagen centrada', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="6.5" y="5" width="11" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' },
    { cls: 'ql-img-align-right', title: 'Imagen a la derecha (texto envuelve)', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="15" y="3" width="8" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="15" y="14" width="8" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="1" y="5" width="11" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' },
  ];

  const alignMap = { 'ql-img-align-left': 'left', 'ql-img-align-center': 'center', 'ql-img-align-right': 'right' };

  alignDefs.forEach(def => {
    const btn = document.createElement('button');
    btn.className = def.cls;
    btn.setAttribute('title', def.title);
    btn.innerHTML = def.svg;
    btn.addEventListener('click', () => {
      if (!_selectedImg || !quill.root.contains(_selectedImg)) {
        showToast('Click en una imagen primero para alinearla', 'error'); return;
      }
      const align = alignMap[def.cls];
      const currentStyle = _selectedImg.getAttribute('data-img-align');
      // Toggle: if already this alignment, reset to normal
      if (currentStyle === align) {
        _selectedImg.removeAttribute('style');
        _selectedImg.removeAttribute('data-img-align');
      } else {
        const styles = {
          left: 'float:left; margin:8px 15px 15px 0; max-width:50%;',
          center: 'display:block; float:none; margin:8px auto;',
          right: 'float:right; margin:8px 0 15px 15px; max-width:50%;'
        };
        _selectedImg.setAttribute('style', styles[align]);
        _selectedImg.setAttribute('data-img-align', align);
      }
      // DON'T call quill.update('user') — it re-renders from Delta and strips inline styles
    });
    alignGroup.appendChild(btn);
  });

  // Insert the align group at the end of the toolbar
  toolbar.appendChild(alignGroup);
}

// URL modal insert
document.getElementById('imgUrlInsert').addEventListener('click', () => {
  const url = imgUrlInput.value.trim();
  if (url) {
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url);
    imgUrlOverlay.classList.remove('active');
    showToast('Imagen insertada');
  }
});

// URL modal cancel
document.getElementById('imgUrlCancel').addEventListener('click', () => {
  imgUrlOverlay.classList.remove('active');
});

// URL modal close on overlay click
imgUrlOverlay.addEventListener('click', (e) => {
  if (e.target === imgUrlOverlay) {
    imgUrlOverlay.classList.remove('active');
  }
});

// URL modal enter key
imgUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('imgUrlInsert').click();
  }
  });

// Escape closes URL modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && imgUrlOverlay.classList.contains('active')) {
    imgUrlOverlay.classList.remove('active');
  }
});

// Handle image upload when triggered from Quill editor
document.getElementById('imageUpload').addEventListener('change', function handler(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!this.getAttribute('data-for-quill')) return;
  // Remove the flag
  this.removeAttribute('data-for-quill');
  // Reset input
  this.value = '';

  const range = quill.getSelection(true);
  const reader = new FileReader();
  reader.onload = async (ev) => {
    // Show loading state
    const loader = quill.getText(range.index, range.length);
    quill.insertText(range.index, 'Subiendo imagen...', { 'color': '#888' });

    const ext = file.name.split('.').pop();
    const filename = 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { data, error } = await sb.storage.from(BUCKET).upload(filename, file, { cacheControl: '31536000', upsert: false });

    // Remove loading text
    quill.deleteText(range.index, 'Subiendo imagen...'.length);

    if (error) {
      showToast('Error al subir imagen: ' + error.message, 'error');
      quill.insertText(range.index, '[Error al subir imagen]', { 'color': 'var(--neon-red)' });
      return;
    }
    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(data.path);
    quill.insertEmbed(range.index, 'image', publicUrl);
    showToast('Imagen insertada en el post');
  };
  reader.readAsArrayBuffer(file);
});

// Style the custom URL image button to match toolbar
const customUrlBtn = document.querySelector('.ql-custom-image-url');
if (customUrlBtn) {
  customUrlBtn.style.cssText = 'width:28px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:none;border:none;color:var(--text-secondary);cursor:pointer;border-radius:4px;';
  customUrlBtn.addEventListener('mouseenter', () => customUrlBtn.style.color = 'var(--text-primary)');
  customUrlBtn.addEventListener('mouseleave', () => customUrlBtn.style.color = 'var(--text-secondary)');
}

// ===== ADD TOOLTIPS TO TOOLBAR BUTTONS =====
// Inject SVG icon into the small-text button (Quill creates it empty)
const smallBtn = toolbar.querySelector('.ql-small');
if (smallBtn) {
  smallBtn.innerHTML = '<svg viewBox="0 0 18 18" width="18" height="18"><path class="ql-stroke" d="M4 13.5L7.5 4.5L11 13.5M5 10.5h5" stroke-linecap="round" stroke-linejoin="round"/><path class="ql-fill" d="M13.5 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" opacity="0.5"/></svg>';
}

const brightBtn = toolbar.querySelector('.ql-bright');
if (brightBtn) {
  brightBtn.innerHTML = '<svg viewBox="0 0 18 18" width="18" height="18"><circle class="ql-fill" cx="9" cy="9" r="3"/><path class="ql-stroke" d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke-linecap="round"/></svg>';
}

document.querySelectorAll('.ql-toolbar button, .ql-toolbar .ql-picker-label').forEach(btn => {
  const cls = btn.className || '';
  let tip = '';
  if (cls.includes('ql-bold')) tip = 'Negrita (Ctrl+B)';
  else if (cls.includes('ql-italic')) tip = 'Cursiva (Ctrl+I)';
  else if (cls.includes('ql-underline')) tip = 'Subrayado (Ctrl+U)';
  else if (cls.includes('ql-strike')) tip = 'Tachado';
  else if (cls.includes('ql-small')) tip = 'Texto pequeño';
  else if (cls.includes('ql-bright')) tip = 'Texto brillante';
  else if (cls.includes('ql-header')) tip = 'Título';
  else if (cls.includes('ql-list')) tip = cls.includes('ql-list-ordered') ? 'Lista numerada' : 'Lista con viñetas';
  else if (cls.includes('ql-blockquote')) tip = 'Cita';
  else if (cls.includes('ql-code-block')) tip = 'Bloque de código';
  else if (cls.includes('ql-link')) tip = 'Insertar link';
  else if (cls.includes('ql-image')) tip = 'Subir imagen desde PC';
  else if (cls.includes('ql-custom-image-url')) tip = 'Insertar imagen por URL';
  else if (cls.includes('ql-video')) tip = 'Insertar video';
  else if (cls.includes('ql-clean')) tip = 'Limpiar formato';
  else if (cls.includes('ql-align')) tip = 'Alineación';
  if (tip) btn.setAttribute('title', tip);
});

// ===== FAB TOGGLE =====
document.getElementById('fabMain').addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('fabMenu').classList.toggle('open');
});

// Close FAB menu when clicking outside
document.addEventListener('click', (e) => {
  const fab = document.getElementById('fabContainer');
  if (!fab.contains(e.target)) {
    document.getElementById('fabMain').classList.remove('open');
    document.getElementById('fabMenu').classList.remove('open');
  }
});

// ===== FAB: COPY MUSEUM CARD =====
document.getElementById('fabMuseum').addEventListener('click', () => {
  const html = `<div class="museum-card" style="--percent: 87%; --humo: 60%;">
    <div class="museum-card-header">
        <div class="badge">
            <i class="material-icons" style="font-size:14px">history</i> Post Rescatado
        </div>
        <div class="original-date">
            Publicado originalmente: <strong>15 de Marzo, 2012</strong>
        </div>
    </div>
    <div class="museum-card-body">
        <div class="metric-nostalgia-col">
            <div class="metric-title">Nivel de Nostalgia</div>
            <div class="metric-nostalgia">
                <div class="chart-container-mini">
                    <div class="circular-chart-mini">
                        <div class="inner-circle-mini">
                            <span class="percentage-mini">87%</span>
                        </div>
                    </div>
                </div>
                <div class="platforms-grid">
                    <span class="platform-tag">MSN Messenger</span>
                    <span class="platform-tag">Megavideo</span>
                    <span class="platform-tag">Flash Player</span>
                    <span class="platform-tag">Windows XP</span>
                </div>
            </div>
        </div>
        <div class="metric-smoke-col">
            <div class="metric-title">\u00cdndice F\u00famico</div>
            <div class="metric-smoke">
                <span class="smoke-fire">\uD83D\uDD25</span>
                <div class="smoke-details">
                    <div class="smoke-gauge">
                        <div class="smoke-bar-fill"></div>
                    </div>
                    <div class="smoke-meta">Nivel: <strong>Moderado-Alto</strong></div>
                </div>
            </div>
        </div>
    </div>
    <div class="curation-changelog">
        <div class="changelog-header">
            <i class="material-icons" style="font-size:14px">terminal</i> ARCHIVE_RESTORATION_LOG
        </div>
        <div class="changelog-line c-fix">[FIX] 5 im\u00e1genes re-hosteadas en Supabase Storage</div>
        <div class="changelog-line c-convert">[CONVERT] 1 archivo .swf reemplazado por emulador Ruffle</div>
        <div class="changelog-line c-remove">[REMOVE] 2 videos de YouTube (Dead Links)</div>
    </div>
</div>`;
  navigator.clipboard.writeText(html).then(() => {
    showToast('Placa Museo copiada al portapapeles');
    document.getElementById('fabMain').classList.remove('open');
    document.getElementById('fabMenu').classList.remove('open');
  });
});

// ===== FAB: COPY TIMELINE =====
document.getElementById('fabTimeline').addEventListener('click', () => {
  const html = `<div class="blog-timeline">
    <div class="timeline-item">
        <div class="timeline-date">1991 - 2004</div>
        <div class="timeline-content">
            <h3>Web 1.0</h3>
            <p>La web est\u00e1tica de "solo lectura". El usuario com\u00fan solo consume informaci\u00f3n.</p>
        </div>
    </div>

    <div class="timeline-item">
        <div class="timeline-date">2004 - 2020</div>
        <div class="timeline-content">
            <h3>Web 2.0</h3>
            <p>La web participativa. Nacen los blogs y las redes sociales donde todos creamos contenido.</p>
        </div>
    </div>

    <div class="timeline-item">
        <div class="timeline-date">2026</div>
        <div class="timeline-content">
            <h3>Web 4.0</h3>
            <p>La web inteligente y simbi\u00f3tica. Modelos de lenguaje e interfaces ultra eficientes.</p>
        </div>
    </div>
</div>`;
  navigator.clipboard.writeText(html).then(() => {
    showToast('Timeline copiada al portapapeles');
    document.getElementById('fabMain').classList.remove('open');
    document.getElementById('fabMenu').classList.remove('open');
  });
});

// ===== FAB: COPY SEPARATOR =====
document.getElementById('fabSeparator').addEventListener('click', () => {
  const html = `<hr style="height: 2px; border: none; background: linear-gradient(to right, #bf5af2, #ff4757, #ffd93d);">`;
  navigator.clipboard.writeText(html).then(() => {
    showToast('Separador copiado al portapapeles');
    document.getElementById('fabMain').classList.remove('open');
    document.getElementById('fabMenu').classList.remove('open');
  });
});

// ===== PREVIEW MODAL =====
document.getElementById('previewBtn').addEventListener('click', () => {
  const title = document.getElementById('postTitle').value.trim();
  const content = getContent();
  const excerpt = document.getElementById('postExcerpt').value.trim();
  const image = document.getElementById('postImageUrl').value.trim();
  const date = document.getElementById('postDate').value;
  const badge = document.getElementById('postBadge').value;
  const badgeColor = document.getElementById('postBadgeColor').value;

  if (!title && !content) {
    showToast('No hay contenido para previsualizar', 'error');
    return;
  }

  const previewBody = document.getElementById('previewBody');
  let html = '';

  // Featured image
  if (image) {
    html += `<img class="preview-featured-img" src="${image}" alt="Preview" onerror="this.style.display='none'" />`;
  }

  // Title
  html += `<h1>${title || 'Sin título'}</h1>`;

  // Meta
  html += '<div class="preview-meta">';
  if (date) {
    html += `<span>📅 ${new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>`;
  } else {
    html += `<span>📅 ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`;
  }
  html += `<span><span class="badge-sm ${badgeColor || 'purple'}" style="font-size:0.7rem;">${badge || 'General'}</span></span>`;
  html += '</div>';

  // Excerpt
  if (excerpt) {
    html += `<p class="preview-excerpt">${excerpt}</p>`;
  }

  // Content
  html += content;

  // Tags
  if (selectedTags.size > 0) {
    const tagNames = allTags
      .filter(t => selectedTags.has(t.id))
      .map(t => t.name);
    if (tagNames.length > 0) {
      html += '<div class="preview-tags">';
      tagNames.forEach(name => {
        html += `<span class="preview-tag">${name}</span>`;
      });
      html += '</div>';
    }
  }

  previewBody.innerHTML = html;
  document.getElementById('previewOverlay').classList.add('active');
});

document.getElementById('previewClose').addEventListener('click', () => {
  document.getElementById('previewOverlay').classList.remove('active');
});

document.getElementById('previewOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('previewOverlay')) {
    document.getElementById('previewOverlay').classList.remove('active');
  }
});

// Escape key closes preview
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('previewOverlay').classList.remove('active');
  }
});

// Check existing session
sb.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminLayout').classList.add('active');
    loadDashboard();
    loadTagsManager();
  }
});
});
