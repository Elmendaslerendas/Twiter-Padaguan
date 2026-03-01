# Guía de Despliegue: Twiter Padaguan 🚀
*De tu Pendrive a todo el Internet en 5 minutos.*

Sigue estos pasos tal cual, como si fuera una receta de cocina:

## 🏁 Paso 1: Subir tus archivos a GitHub (Sin comandos)
1. **Crea una cuenta** en [GitHub.com](https://github.com/) si no la tienes.
2. Pulsa el botón verde **"New"** (o "New Repository").
3. Ponle de nombre: `twiter-alicia`. 
4. Déjalo en **Public** y no marques ninguna otra casilla. Dale abajo a **"Create repository"**.
5. Ahora verás una pantalla con códigos raros. Ignóralos. Busca donde dice: *"uploading an existing file"* y haz clic ahí.
6. **Abre la carpeta de tu Pendrive** en tu ordenador.
7. **Selecciona todos estos archivos** y arrástralos directamente a la ventana de GitHub:
   - `index.html`
   - `style.css`
   - `app.js`
   - `config.js`
   - `_redirects`
   - `README.md`
8. Espera a que termine la barra azul. Abajo, en el cuadro que dice "Commit changes", escribe `Primera versión` y dale al botón verde **"Commit changes"**.

¡Ya tienes tu código en la nube! ✅

---

## 🚀 Paso 2: Encender la web en Cloudflare
1. Entra en [Cloudflare Pages](https://dash.cloudflare.com/) y crea tu cuenta.
2. En el menú de la izquierda, ve a **"Workers & Pages"**.
3. Pulsa el botón azul **"Create application"**.
4. Selecciona la pestaña que dice **"Pages"** y luego el botón **"Connect to Git"**.
5. Elige **GitHub** y dale permiso (te pedirá que selecciones tu cuenta).
6. Selecciona tu repositorio `twiter-alicia`. Pulsa **"Begin setup"**.
7. En la siguiente pantalla (**Configuration**), no toques nada. Asegúrate de que:
   - *Framework preset* sea **"None"**.
   - *Build command* esté **vacío**.
   - *Output directory* sea **"./"**.
8. Pulsa **"Save and Deploy"**.

---

## 🎉 ¡Misión Cumplida!
Cloudflare te dará una URL (algo como `twiter-alicia.pages.dev`). Ábrela. ¡Tu red social ya es pública y cualquiera con ese enlace podrá publicar desde su móvil! 🥂
