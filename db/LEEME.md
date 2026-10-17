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

Turnstile tiene que crearse en la cuenta de Cloudflare de Nahuel, no en otra. Dominios del widget: `localhost`, `127.0.0.1` y `nahuex227.github.io`. La site key va en `config.js` → `auth.turnstileSiteKey`. La secret key va en Supabase → Authentication → Attack Protection → Turnstile.

### 3. Google OAuth
Providers › Google + Redirect URLs como arriba (HTTP, no file).

## Panel de productos

Página `admin.html`. Solo los emails de la tabla `admins` pueden crear, editar, borrar productos y subir fotos al bucket `productos`.

El primer admin cargado es `dic0408@gmail.com`. Para sumar otro:

```sql
insert into public.admins (email) values ('otro@email.com');
```

Con sesión de admin aparece el enlace **Panel** en el menú.

## Checkout

En **carrito.html**: invitado, ingresar o registrarse antes del formulario de envío.

## Publicación (GitHub Pages)

Sitio: https://nahuex227.github.io/ProSport-Ober-/

Desde la carpeta `sitio-base`: `git add .` → `git commit` → `git push origin main`. El workflow publica en 1–2 min.

Supabase redirect: `https://nahuex227.github.io/ProSport-Ober-/cuenta.html`
