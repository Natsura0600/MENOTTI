# Sitio de reservas de canchas

Web pública + reservas online + panel del complejo (agenda, caja, fotos, avisos al celular).

## Cómo está hecho
- **Next.js 15 (App Router) + React 19 + TypeScript**, desplegado en Vercel.
- **Upstash Redis** como base de datos (`lib/kv.ts`). Sin las variables usa memoria (solo para probar: se borra sola).
- **Caché** (`lib/cache.ts`): lo que solo se muestra sale de la caché de Vercel y se invalida al guardar. Las escrituras leen siempre la base.
- **Notificaciones push** estándar (Web Push + VAPID) con `web-push` y un service worker (`public/sw.js`).
- Sin librerías de interfaz: un solo `app/globals.css`.

## Variables de entorno
| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Base de datos | Sí, en producción |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Avisos al celular. Si se cambian, hay que volver a activar los avisos en cada celular | Para tener avisos |
| `SITE_URL` | Dominio propio (ej: `https://www.midominio.com.ar`) para SEO | Cuando haya dominio |
| `AUTH_SECRET` | Clave de sesiones (si falta, se genera sola y queda en la base) | No |
| `GOOGLE_SITE_VERIFICATION` | Verificar el sitio en Google Search Console | No |
| `KV_DEBUG` | Con `1`, escribe en el log cada comando que va a la base (para medir consumo) | No |

## Usuarios del panel (`/panel`)
- **Dueño**: ve todo. Crea la contraseña la primera vez que entra.
- **Empleado**: lo crea el dueño en Ajustes. Ve solo los turnos y la caja de cada turno.
La contraseña que se escribe define con qué usuario se entra.

## Dónde está cada cosa
- `app/page.tsx` portada · `app/Booking.tsx` formulario de reserva · `app/reserva/[id]` comprobante
- `app/panel/Panel.tsx` agenda, canchas, web, ajustes · `app/panel/Caja.tsx` bebidas y pagos · `app/panel/Notif.tsx` avisos
- `app/api/` reservas, disponibilidad, login y todo lo del panel
- `lib/data.ts` reglas de negocio (turnos, fijos, caja, candado anti-doble reserva) · `lib/auth.ts` sesiones y roles · `lib/push.ts` avisos
- `lib/site.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `app/opengraph-image.tsx` SEO y app instalable

## Datos en la base (claves de Redis)
`config`, `courts`, `products`, `fijos`, `auth`, `push` · por día: `res:AAAA-MM-DD` (reservas), `caja:AAAA-MM-DD` (bebidas y pagos), `fskip:AAAA-MM-DD` (fijos liberados) · `img:*` (logo, portada, fotos)

## Comandos
`npm install` · `npm run dev` · `npm run build`

Todo el contenido (textos, precios, canchas, horarios, productos, logo, fotos) se cambia desde `/panel`, sin tocar código.
