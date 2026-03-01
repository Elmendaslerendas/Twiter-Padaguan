// 🚀 El Cerebro de la Operación: Navegación + Supabase
console.log("Sistema de misión iniciado...");

// 1. Identificación del Dispositivo
let deviceId = localStorage.getItem('device_id');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
}

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
    `
};

// 5. El Motor de Navegación (Router)
function router() {
    const hash = window.location.hash || '#';
    navLinks.forEach(link => link.classList.remove('active'));

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

// 6. Lógica del Feed (Leer Datos)
async function setupFeedPage() {
    const postsList = document.getElementById('posts-list');

    // Obtener posts de Supabase
    const { data: posts, error } = await _supabase
        .from('posts')
        .select(`*, likes(count)`)
        .order('created_at', { ascending: false });

    if (error) {
        postsList.innerHTML = `<p style="color:red">Error de conexión: ${error.message}</p>`;
        return;
    }

    if (posts.length === 0) {
        postsList.innerHTML = `<p class="timestamp" style="text-align:center; margin-top:2rem;">Nadie ha escrito nada todavía. ¡Sé la primera!</p>`;
        return;
    }

    // Renderizar posts
    postsList.innerHTML = posts.map(post => {
        const isOwner = post.author_id === deviceId;
        const date = new Date(post.created_at).toLocaleDateString();
        const likeCount = post.likes?.[0]?.count || 0;

        return `
            <div class="post-card animation-fade">
                <div class="post-content">${escapeHTML(post.content)}</div>
                <div class="post-footer">
                    <span class="timestamp">${date}</span>
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
        // Recargar solo los datos, no toda la vista si es posible, 
        // pero para este MVP refrescamos el feed
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
