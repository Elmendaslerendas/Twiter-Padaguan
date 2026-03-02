// 🚀 Twiter Padaguan v2.0 - Edición Master (Hilos y Comentarios)
console.log("Iniciando App con URL:", SUPABASE_URL);

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let deviceId = localStorage.getItem('device_id');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
}

let userProfile = null;
let realtimeChannel = null;
const viewContainer = document.getElementById('view-container');
const navLinks = document.querySelectorAll('#bottom-nav a');

const views = {
    feed: `<div id="feed-view"><div id="posts-list"><div class="loading-spinner">Cargando...</div></div></div>`,
    new: `
        <div id="new-view" class="animation-fade" style="padding: 1rem;">
            <div class="new-post-form">
                <textarea id="post-content" placeholder="¿Qué está pasando?"></textarea>
                <div id="char-count" style="text-align: right; color: var(--text-muted); font-size: 0.8rem; margin-top: -10px; margin-bottom: 10px;">0 / 280</div>
                
                <div style="background: var(--glass-heavy); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="font-size: 0.8rem; color: var(--accent); font-weight: 700; margin-bottom: 8px; display: block;">SUBIR DESDE MÓVIL / PC</label>
                        <input type="file" id="post-file" accept="image/*,video/*" style="width: 100%; color: var(--text-muted); font-size: 0.9rem;">
                        <div id="file-status" style="font-size: 0.84rem; color: #00ba7c; margin-top: 8px; font-weight: 600;"></div>
                    </div>
                    
                    <div style="height: 1px; background: var(--glass-border); width: 100%;"></div>
                    
                    <div>
                        <label style="font-size: 0.8rem; color: var(--accent); font-weight: 700; margin-bottom: 8px; display: block;">O PEGAR ENLACE (URL)</label>
                        <input type="text" id="post-media-url" placeholder="https://ejemplo.com/foto.jpg" 
                               style="width: 100%; background: transparent; border: none; color: #fff; outline: none; font-size: 0.9rem;">
                    </div>
                </div>
                
                <button id="btn-publish" class="btn-publish" style="margin-top: 10px;">Publicar</button>
            </div>
        </div>
    `,
    profileModal: `
        <div class="modal-overlay" id="profile-modal">
            <div class="modal-content">
                <h2>¡Hola, Padaguan!</h2>
                <p>Para empezar, elige un nombre de usuario.</p>
                <input type="text" id="username-input" placeholder="Tu nombre..." maxlength="20">
                <button id="btn-save-profile">Confirmar Nombre</button>
            </div>
        </div>
    `
};

// ⚡ Tiempo Real Maestro
function setupRealtime() {
    if (realtimeChannel) return;

    realtimeChannel = _supabase.channel('cambios-globales')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => setupFeedPage())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => setupFeedPage())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => setupFeedPage())
        .subscribe();
}

async function checkProfile() {
    try {
        const { data } = await _supabase.from('identidades_padaguan').select('*').eq('device_id', deviceId).maybeSingle();
        if (data) {
            userProfile = data;
        } else {
            showProfileModal();
        }
    } catch (e) {
        showProfileModal();
    }
}

function showProfileModal() {
    if (document.getElementById('profile-modal')) return;
    document.body.classList.add('modal-open');
    const div = document.createElement('div');
    div.innerHTML = views.profileModal;
    document.body.appendChild(div);

    const btn = document.getElementById('btn-save-profile');
    const input = document.getElementById('username-input');

    btn.addEventListener('click', async () => {
        const username = input.value.trim();
        if (!username) return alert("Escribe un nombre.");
        btn.disabled = true;
        const { error } = await _supabase.from('identidades_padaguan').upsert({ device_id: deviceId, username: username });
        if (error) {
            alert(`Error: ${error.message}`);
            btn.disabled = false;
        } else {
            userProfile = { device_id: deviceId, username: username };
            document.body.removeChild(div);
            document.body.classList.remove('modal-open');
            router();
        }
    });
}

function getMediaType(url) {
    if (!url) return null;
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov'];
    const lowerUrl = url.toLowerCase();
    if (videoExts.some(ext => lowerUrl.endsWith(ext) || lowerUrl.includes('video'))) return 'video';
    return 'image';
}

async function setupFeedPage() {
    const postsList = document.getElementById('posts-list');
    if (!postsList) return;

    const { data: posts, error } = await _supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (error) {
        postsList.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        return;
    }

    const { data: profiles } = await _supabase.from('identidades_padaguan').select('device_id, username');
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.device_id] = p.username);

    const { data: likes } = await _supabase.from('likes').select('post_id');
    const { data: allComments } = await _supabase.from('comments').select('*').order('created_at', { ascending: true });

    postsList.innerHTML = posts.map(post => {
        const isOwner = post.author_id === deviceId;
        const authorName = profileMap[post.author_id] || "Anónimo";
        const likeCount = likes ? likes.filter(l => l.post_id === post.id).length : 0;
        const postComments = allComments ? allComments.filter(c => c.post_id === post.id) : [];
        const date = new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'video') {
                mediaHtml = `<div class="post-media"><video src="${post.media_url}" controls muted loop playsinline></video></div>`;
            } else {
                mediaHtml = `<div class="post-media"><img src="${post.media_url}" alt="Post media"></div>`;
            }
        }

        // Renderizado de comentarios
        const commentsListHtml = postComments.map(c => `
            <div class="comment-item">
                <strong class="comment-author">@${escapeHTML(profileMap[c.author_id] || "Anónimo")}</strong>
                <div class="comment-content">${escapeHTML(c.content)}</div>
            </div>
        `).join('');

        return `
            <div class="post-card">
                <strong class="post-author">@${escapeHTML(authorName)}</strong>
                <div class="post-content">${escapeHTML(post.content)}</div>
                ${mediaHtml}
                <div class="post-footer">
                    <span class="timestamp">${date}</span>
                    <div style="display:flex; gap: 15px; align-items:center;">
                        <button class="btn-toggle-comments" onclick="toggleComments('${post.id}')">💬 ${postComments.length}</button>
                        <button class="btn-like" onclick="handleLike('${post.id}')">❤️ ${likeCount}</button>
                        ${isOwner ? `<button class="btn-delete" onclick="handleDelete('${post.id}')">🗑️</button>` : ''}
                    </div>
                </div>

                <div id="comments-${post.id}" class="comments-section">
                    <div class="comment-input-area">
                        <input type="text" id="input-comment-${post.id}" placeholder="Escribe un comentario...">
                        <button class="btn-comment-send" onclick="sendComment('${post.id}')">🚀</button>
                    </div>
                    <div class="comments-list">
                        ${commentsListHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleComments = (postId) => {
    const el = document.getElementById(`comments-${postId}`);
    el.classList.toggle('active');
};

window.sendComment = async (postId) => {
    const input = document.getElementById(`input-comment-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    const { error } = await _supabase.from('comments').insert([{
        post_id: postId,
        author_id: deviceId,
        content: content
    }]);

    if (error) alert("Error: " + error.message);
    else input.value = ''; // Se limpia y Realtime actualizará el feed
};

function setupNewPostPage() {
    const btn = document.getElementById('btn-publish');
    const textarea = document.getElementById('post-content');
    const mediaInput = document.getElementById('post-media-url');
    const fileInput = document.getElementById('post-file');
    const fileStatus = document.getElementById('file-status');
    const charCount = document.getElementById('char-count');

    const updateBtnState = () => {
        const text = textarea.value.trim();
        const hasText = text.length > 0;
        const hasFile = fileInput.files.length > 0;
        const hasUrl = mediaInput.value.trim().length > 0;
        charCount.innerText = `${textarea.value.length} / 280`;
        btn.disabled = (!hasText && !hasFile && !hasUrl) || textarea.value.length > 280;
    };

    textarea.addEventListener('input', updateBtnState);
    mediaInput.addEventListener('input', updateBtnState);
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) fileStatus.innerText = "✅ Archivo listo: " + fileInput.files[0].name;
        else fileStatus.innerText = "";
        updateBtnState();
    });

    btn.addEventListener('click', async () => {
        btn.innerText = "Publicando...";
        btn.disabled = true;
        let finalMediaUrl = mediaInput.value.trim() || null;
        let finalMediaType = getMediaType(finalMediaUrl);

        try {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
                const filePath = `${deviceId}/${fileName}`;
                const { error: upErr } = await _supabase.storage.from('media').upload(filePath, file);
                if (upErr) throw upErr;
                const { data } = _supabase.storage.from('media').getPublicUrl(filePath);
                finalMediaUrl = data.publicUrl;
                finalMediaType = file.type.startsWith('video') ? 'video' : 'image';
            }
            const { error: postErr } = await _supabase.from('posts').insert([{
                content: textarea.value.trim(),
                author_id: deviceId,
                media_url: finalMediaUrl,
                media_type: finalMediaType
            }]);
            if (postErr) throw postErr;
            window.location.hash = '#';
        } catch (e) {
            alert("Error: " + e.message);
            btn.innerText = "Publicar";
            btn.disabled = false;
        }
    });
    textarea.focus();
    updateBtnState();
}

window.handleLike = async (postId) => {
    await _supabase.from('likes').insert([{ post_id: postId, device_id: deviceId }]);
};

window.handleDelete = async (postId) => {
    if (confirm("¿Borrar post?")) {
        await _supabase.from('posts').delete().eq('id', postId).eq('author_id', deviceId);
    }
};

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

async function router() {
    const hash = window.location.hash || '#';
    navLinks.forEach(link => link.classList.remove('active'));
    if (!userProfile) await checkProfile();
    setupRealtime();

    if (hash === '#new') {
        viewContainer.innerHTML = views.new;
        document.querySelector('a[href="#new"]').classList.add('active');
        setupNewPostPage();
    } else {
        viewContainer.innerHTML = views.feed;
        document.querySelector('a[href="#"]').classList.add('active');
        setupFeedPage();
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
