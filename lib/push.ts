import webpush from "web-push";
import { bust, cached, TAG } from "./cache";
import { kv } from "./kv";
import type { Role } from "./types";

/**
 * Notificaciones push al celular del dueño y del empleado (estándar Web Push con claves VAPID).
 * Variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT (https://... o mailto:...).
 * Sin esas variables el sitio funciona igual, solo que no manda avisos.
 */
export const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
export const pushReady = !!(VAPID_PUBLIC && VAPID_PRIVATE);

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
type Stored = { sub: Sub; role: Role; at: number };
export type PushMsg = { title: string; body: string; url?: string; tag?: string };

const KEY = "push";
const MAX_DEVICES = 20;

let configured = false;
function setup() {
  if (configured || !pushReady) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://menotti.vercel.app", VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

/** Identificador corto y estable de un dispositivo */
async function idOf(endpoint: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(h).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function validSub(s: unknown): s is Sub {
  const x = s as Sub;
  return !!x && typeof x.endpoint === "string" && /^https:\/\//.test(x.endpoint) && x.endpoint.length < 1000 && typeof x.keys?.p256dh === "string" && typeof x.keys?.auth === "string";
}

/** Celulares suscriptos (con caché: avisar una reserva no gasta comandos) */
const devices = () => cached(["push"], [TAG.push], 86400, () => kv.hgetall<Stored>(KEY));

export async function subscribe(sub: Sub, role: Role) {
  const all = await kv.hgetall<Stored>(KEY);
  const id = await idOf(sub.endpoint);
  if (!all[id] && Object.keys(all).length >= MAX_DEVICES) {
    // se saca el dispositivo más viejo para no acumular
    const oldest = Object.entries(all).sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) await kv.hdel(KEY, oldest[0]);
  }
  await kv.hset(KEY, id, { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, role, at: Date.now() } satisfies Stored);
  bust(TAG.push);
}

export async function unsubscribe(endpoint: string) {
  await kv.hdel(KEY, await idOf(endpoint));
  bust(TAG.push);
}

async function send(id: string, s: Stored, msg: PushMsg) {
  try {
    await webpush.sendNotification(s.sub, JSON.stringify(msg), { TTL: 60 * 60 * 6, urgency: "high" });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    // 404/410: el celular desinstaló la app o quitó el permiso
    if (code === 404 || code === 410) {
      await kv.hdel(KEY, id);
      bust(TAG.push);
    } else console.error("[push]", code ?? e);
    return false;
  }
}

/** Avisa a todos los celulares suscriptos. Devuelve a cuántos llegó. */
export async function notifyAll(msg: PushMsg) {
  if (!pushReady) return 0;
  setup();
  const all = await devices();
  const done = await Promise.all(Object.entries(all).map(([id, s]) => send(id, s, msg)));
  return done.filter(Boolean).length;
}

/** Aviso de prueba a un solo celular */
export async function notifyOne(endpoint: string, msg: PushMsg) {
  if (!pushReady) return false;
  setup();
  const id = await idOf(endpoint);
  const s = (await devices())[id];
  return s ? send(id, s, msg) : false;
}
