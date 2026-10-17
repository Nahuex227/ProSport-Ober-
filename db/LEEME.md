# Supabase — ProSport + LEGACYZ

**Proyecto:** `hrrqpmcscvzeaowbinrt`

## Registro / login (errores comunes)

### 1. `file://` en la URL
No abras el HTML con doble clic. Usá **Live Server** y en `js/config.js`:

```js
auth: {
  baseUrl: "http://127.0.0.1:5500/sitio-base/",
}
```

En Supabase › **Authentication › URL Configuration**, agregá la misma base en **Redirect URLs**.

### 2. `captcha protection: no captcha_token`
Supabase tiene CAPTCHA activo. Para el TP (más simple):

- **Authentication › Bot and Abuse Protection** → desactivar CAPTCHA en signup/login

O bien: crear widget en Cloudflare Turnstile, vincularlo en Supabase y poner el **Site Key** en `config.js` → `auth.turnstileSiteKey`.

### 3. Google OAuth
Providers › Google + Redirect URLs como arriba (HTTP, no file).

## Checkout

En **carrito.html**: invitado, ingresar o registrarse antes del formulario de envío.

## Publicación (GitHub Pages)

Sitio: https://nahuex227.github.io/ProSport-Ober-/

Desde la carpeta `sitio-base`: `git add .` → `git commit` → `git push origin main`. El workflow publica en 1–2 min.

Supabase redirect: `https://nahuex227.github.io/ProSport-Ober-/cuenta.html`
