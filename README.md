# Sitio de reservas de canchas

Web pública + sistema de reservas online + panel de administración.

## Cómo está hecho
- **Next.js 15 (App Router) + React 19 + TypeScript**, desplegado en Vercel.
- **Upstash Redis** como base de datos (`lib/kv.ts`). Sin las variables, usa memoria (solo para probar).
- Sin librerías de interfaz ni CSS externas: un solo `app/globals.css`.

## Variables de entorno
| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Base de datos | Sí, en producción |
| `SITE_URL` | Dominio propio (ej: `https://www.midominio.com.ar`) para SEO | Cuando haya dominio |
| `AUTH_SECRET` | Clave de sesiones (si falta, se genera sola) | No |
| `GOOGLE_SITE_VERIFICATION` | Verificar el sitio en Google Search Console | No |

## Dónde está cada cosa
- `app/page.tsx` — portada · `app/Booking.tsx` — formulario de reserva · `app/panel/` — administración
- `app/api/` — reservas, disponibilidad, login y panel
- `lib/data.ts` — reglas de negocio (turnos, turnos fijos, candado anti-doble reserva)
- `lib/site.ts` — SEO: datos estructurados, preguntas frecuentes, dirección del sitio
- `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `app/opengraph-image.tsx` — SEO técnico

## Comandos
`npm install` · `npm run dev` · `npm run build`

Todo el contenido (textos, precios, canchas, horarios, logo, portada) se cambia desde `/panel`, sin tocar código.
