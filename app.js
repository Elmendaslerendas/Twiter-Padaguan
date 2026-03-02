// 🚀 El Cerebro de la Operación: Navegación + Supabase
console.log("Sistema de misión iniciado...");

// 1. Identificación del Dispositivo
let deviceId = localStorage.getItem('device_id');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
}
let userProfile = null;

// 2. Inicializar Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Elementos del DOM
const viewContainer = document.getElementById('view-container');
const navLinks = document.querySelectorAll('#bottom-nav a');

// 4. Vistas (Templates)
const views = {
    feed: `
        <div id="feed-view">
            <div id="posts-list">
                <div class="loading-spinner">Conectando con la base de datos...</div>
            </div>
        </div>
    `,
    new: `
        <div id="new-view" class="animation-fade">
            <div class="new-post-form">
                <textarea id="post-content" placeholder="¿Qué está pasando en la familia hoy?"></textarea>
                <div id="char-count" style="text-align: right; color: var(--text-muted); font-size: 0.8rem;">0 / 280</div>
                <button id="btn-publish" class="btn-publish">Publicar en el Feed</button>
            </div>
        </div>
    `,
    profileModal: `
        <div class="modal-overlay" id="profile-modal">
            <div class="modal-content">
                <h2>¡Bienvenido, Padaguan!</h2>
                <p style="margin-bottom: 1rem; color: var(--text-muted);">Elige tu apodo para que todos sepan quién escribe.</p>
                <input type="text" id="username-input" placeholder="Tu nombre o apodo..." maxlength="20">
                <button id="btn-save-profile">Empezar a publicar</button>
            </div>
        </div>
    `
};

// 5. El Motor de Navegación (Router)
async function router() {
    const hash = window.location.hash || '#';
    navLinks.forEach(link => link.classList.remove('active'));

    // Verificar perfil antes de seguir
    if (!userProfile) {
        await checkProfile();
    }

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

// 5.1 Lógica de Perfil
async function checkProfile() {
    const { data, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('device_id', deviceId)
        .single();

    if (data) {
        userProfile = data;
    } else {
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
        if (!username) return alert("Por favor, elige un nombre.");

        btn.disabled = true;
        btn.innerText = "Guardando...";

        const { error } = await _supabase
            .from('profiles')
            .upsert({ device_id: deviceId, username: username });

        if (error) {
            alert("Error al guardar: " + error.message);
            btn.disabled = false;
            btn.innerText = "Empezar a publicar";
        } else {
            userProfile = { device_id: deviceId, username: username };
            document.body.removeChild(div);
            document.body.classList.remove('modal-open');
            router(); // Recargar para mostrar el feed bien
        }
    });
}

// 6. Lógica del Feed (Leer Datos)
async function setupFeedPage() {
    const postsList = document.getElementById('posts-list');

    // 6.1 Obtener posts
    const { data: posts, error: postsError } = await _supabase
        .from('posts')
        .select(`*`)
        .order('created_at', { ascending: false });

    if (postsError) {
        postsList.innerHTML = `<p style="color:red">Error de conexión: ${postsError.message}</p>`;
        return;
    }

    // 6.2 Obtener todos los perfiles para asociar nombres
    const { data: profiles } = await _supabase.from('profiles').select('device_id, username');
    const profileMap = {};
    if (profiles) {
        profiles.forEach(p => profileMap[p.device_id] = p.username);
    }

    // 6.3 Obtener likes
    const { data: likes } = await _supabase.from('likes').select('post_id');

    if (posts.length === 0) {
        postsList.innerHTML = `<p class="timestamp" style="text-align:center; margin-top:2rem;">Nadie ha escrito nada todavía. ¡Sé la primera!</p>`;
        return;
    }

    // Renderizar posts
    postsList.innerHTML = posts.map(post => {
        const isOwner = post.author_id === deviceId;
        const dateObj = new Date(post.created_at);
        const date = dateObj.toLocaleDateString();
        const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Contar likes para este post
        const likeCount = likes ? likes.filter(l => l.post_id === post.id).length : 0;
        const authorName = profileMap[post.author_id] || "Anónimo";

        return `
            <div class="post-card animation-fade">
                <strong class="post-author">@${escapeHTML(authorName)}</strong>
                <div class="post-content">${escapeHTML(post.content)}</div>
                <div class="post-footer">
                    <span class="timestamp">${date} - ${time}</span>
                    <div style="display:flex; gap: 15px; align-items:center;">
                        <button class="btn-like" onclick="handleLike(event, '${post.id}')">
                            ❤️ <span>${likeCount}</span>
                        </button>
                        ${isOwner ? `<button class="btn-delete" onclick="handleDelete('${post.id}')">🗑️</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 7. Lógica de Publicar (Escribir Datos)
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

        const { error } = await _supabase
            .from('posts')
            .insert([{ content: content, author_id: deviceId }]);

        if (error) {
            alert("Error al publicar: " + error.message);
            btn.innerText = "Publicar";
            btn.disabled = false;
        } else {
            window.location.hash = '#'; // Volver al feed
        }
    });

    textarea.focus();
}

// 8. Funciones Globales para Likes y Delete
window.handleLike = async (event, postId) => {
    // Feedback visual inmediato
    const btn = event.currentTarget;
    btn.classList.add('liked-animation');

    const { error } = await _supabase
        .from('likes')
        .insert([{ post_id: postId, device_id: deviceId }]);

    if (error && error.code !== '23505') { // Ignorar error de "duplicado"
        alert("Error al dar like");
        btn.classList.remove('liked-animation');
    } else {
        setupFeedPage();
    }
};

window.handleDelete = async (postId) => {
    if (!confirm("¿Seguro que quieres borrar este post?")) return;

    const { error } = await _supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', deviceId); // Doble seguridad

    if (error) {
        alert("No pudimos borrar el post.");
    } else {
        setupFeedPage();
    }
};

// Utilidad para evitar inyección de código
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

// Iniciar app
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
