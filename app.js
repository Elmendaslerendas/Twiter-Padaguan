// 🚀 Twiter Padaguan v2.0 - Edición Multimedia Pro
console.log("Conectando a:", SUPABASE_URL);

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let deviceId = localStorage.getItem('device_id');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
}

let userProfile = null;
const viewContainer = document.getElementById('view-container');
const navLinks = document.querySelectorAll('#bottom-nav a');

const views = {
    feed: `<div id="feed-view"><div id="posts-list"><div class="loading-spinner">Cargando...</div></div></div>`,
    new: `
        <div id="new-view" class="animation-fade" style="padding: 1rem;">
            <div class="new-post-form">
                <textarea id="post-content" placeholder="¿Qué está pasando?"></textarea>
                <div id="char-count" style="text-align: right; color: var(--text-muted); font-size: 0.9rem; margin-top: -10px; margin-bottom: 10px;">0 / 280</div>
                
                <div style="background: var(--glass-heavy); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="font-size: 0.8rem; color: var(--accent); font-weight: 700; margin-bottom: 8px; display: block;">SUBIR DESDE MÓVIL / PC</label>
                        <input type="file" id="post-file" accept="image/*,video/*" style="width: 100%; color: var(--text-muted); font-size: 0.9rem;">
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

async function checkProfile() {
    try {
        const { data, error } = await _supabase.from('identidades_padaguan').select('*').eq('device_id', deviceId).maybeSingle();
        if (error) throw error;
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
        btn.innerText = "Guardando...";

        const { error } = await _supabase.from('identidades_padaguan').upsert({ device_id: deviceId, username: username });

        if (error) {
            alert(`SISTEMA DE DIAGNÓSTICO:\n\n1. El error es: ${error.message}\n2. Estamos intentando conectar a: ${SUPABASE_URL}`);
            btn.disabled = false;
            btn.innerText = "Confirmar Nombre";
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
    const { data: posts, error } = await _supabase.from('posts').select('*').order('created_at', { ascending: false });

    if (error) {
        postsList.innerHTML = `<p style="color:red">Error en posts: ${error.message}</p>`;
        return;
    }

    const { data: profiles } = await _supabase.from('identidades_padaguan').select('device_id, username');
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.device_id] = p.username);

    const { data: likes } = await _supabase.from('likes').select('post_id');

    postsList.innerHTML = posts.map(post => {
        const isOwner = post.author_id === deviceId;
        const authorName = profileMap[post.author_id] || "Anónimo";
        const likeCount = likes ? likes.filter(l => l.post_id === post.id).length : 0;
        const date = new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'video') {
                mediaHtml = `<div class="post-media"><video src="${post.media_url}" controls muted loop playsinline></video></div>`;
            } else {
                mediaHtml = `<div class="post-media"><img src="${post.media_url}" alt="Post media"></div>`;
            }
        }

        return `
            <div class="post-card">
                <strong class="post-author">@${escapeHTML(authorName)}</strong>
                <div class="post-content">${escapeHTML(post.content)}</div>
                ${mediaHtml}
                <div class="post-footer">
                    <span class="timestamp">${date}</span>
                    <div style="display:flex; gap: 15px; align-items:center;">
                        <button class="btn-like" onclick="handleLike(event, '${post.id}')">❤️ ${likeCount}</button>
                        ${isOwner ? `<button class="btn-delete" onclick="handleDelete('${post.id}')">🗑️</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setupNewPostPage() {
    const btn = document.getElementById('btn-publish');
    const textarea = document.getElementById('post-content');
    const mediaInput = document.getElementById('post-media-url');
    const fileInput = document.getElementById('post-file');
    const charCount = document.getElementById('char-count');

    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.innerText = `${len} / 280`;
        btn.disabled = len === 0 || len > 280;
    });

    btn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) return;

        btn.innerText = "Subiendo...";
        btn.disabled = true;

        let finalMediaUrl = mediaInput.value.trim() || null;
        let finalMediaType = getMediaType(finalMediaUrl);

        // Si hay un archivo seleccionado, lo subimos
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${deviceId}/${fileName}`;

            const { error: uploadError } = await _supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) {
                alert("Error al subir archivo: " + uploadError.message);
                btn.innerText = "Publicar";
                btn.disabled = false;
                return;
            }

            const { data: publicUrlData } = _supabase.storage.from('media').getPublicUrl(filePath);
            finalMediaUrl = publicUrlData.publicUrl;
            finalMediaType = file.type.startsWith('video') ? 'video' : 'image';
        }

        const postData = {
            content,
            author_id: deviceId,
            media_url: finalMediaUrl,
            media_type: finalMediaType
        };

        const { error } = await _supabase.from('posts').insert([postData]);
        if (error) {
            alert("Error: " + error.message);
            btn.innerText = "Publicar";
            btn.disabled = false;
        } else {
            window.location.hash = '#';
        }
    });
    textarea.focus();
}

window.handleLike = async (event, postId) => {
    const btn = event.currentTarget;
    btn.classList.add('liked-animation');
    const { error } = await _supabase.from('likes').insert([{ post_id: postId, device_id: deviceId }]);
    if (error && error.code !== '23505') alert("Error al dar like");
    else setupFeedPage();
};

window.handleDelete = async (postId) => {
    if (confirm("¿Borrar post?")) {
        await _supabase.from('posts').delete().eq('id', postId).eq('author_id', deviceId);
        setupFeedPage();
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
