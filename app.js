// 🚀 Twiter Padaguan v2.0 - Edición Fuerza Bruta
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
        <div id="new-view" class="animation-fade">
            <div class="new-post-form">
                <textarea id="post-content" placeholder="¿Qué está pasando?"></textarea>
                <div id="char-count" style="text-align: right; color: var(--text-muted); font-size: 0.9rem;">0 / 280</div>
                <button id="btn-publish" class="btn-publish">Publicar</button>
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
        // Intentamos leer de la nueva tabla
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
        btn.innerText = "Guardando...";

        // Guardar en la nueva tabla
        const { error } = await _supabase.from('identidades_padaguan').upsert({ device_id: deviceId, username: username });

        if (error) {
            alert("Error Supabase: " + error.message + "\n\nSi el error dice 'Could not find table', espera 20 segundos y vuelve a darle a Confirmar.");
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

async function setupFeedPage() {
    const postsList = document.getElementById('posts-list');
    const { data: posts, error } = await _supabase.from('posts').select('*').order('created_at', { ascending: false });

    if (error) {
        postsList.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        return;
    }

    // Buscamos los nombres en la nueva tabla
    const { data: profiles } = await _supabase.from('identidades_padaguan').select('device_id, username');
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.device_id] = p.username);

    const { data: likes } = await _supabase.from('likes').select('post_id');

    postsList.innerHTML = posts.map(post => {
        const isOwner = post.author_id === deviceId;
        const authorName = profileMap[post.author_id] || "Anónimo";
        const likeCount = likes ? likes.filter(l => l.post_id === post.id).length : 0;
        const date = new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        return `
            <div class="post-card">
                <strong class="post-author">@${escapeHTML(authorName)}</strong>
                <div class="post-content">${escapeHTML(post.content)}</div>
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
    const charCount = document.getElementById('char-count');

    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.innerText = `${len} / 280`;
        btn.disabled = len === 0 || len > 280;
    });

    btn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) return;
        btn.innerText = "Publicando...";
        btn.disabled = true;
        const { error } = await _supabase.from('posts').insert([{ content, author_id: deviceId }]);
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
