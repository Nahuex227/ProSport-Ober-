# ProSport Oberá

Tienda demo (HTML, CSS, JS) con carrito, checkout y Supabase.

**Sitio publicado:** https://nahuex227.github.io/ProSport-Ober-/

## Subir cambios (commit + push)

Trabajá siempre en esta carpeta `sitio-base` (es el repo Git):

```bash
cd sitio-base
git status
git add .
git commit -m "Describe el cambio"
git push origin main
```

En 1–2 minutos GitHub Actions publica el sitio. Revisá la pestaña **Actions** del repo y la URL de arriba.

## Desarrollo local

Abrí esta carpeta con Live Server. Supabase y auth detectan la URL solos; en producción usan GitHub Pages.

## Supabase

Proyecto compartido con LEGACYZ (`hrrqpmcscvzeaowbinrt`). Ver `db/LEEME.md`.

En Authentication › URL Configuration agregá:

- `https://nahuex227.github.io/ProSport-Ober-/cuenta.html`
