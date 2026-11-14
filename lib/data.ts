import { kv } from "./kv";
import { addDays, dayOfWeek, minutesUntil, todayStr } from "./time";
import type { Booking, Config, Court, Fijo, LastBooking, Reserva, Tipo } from "./types";

// ---------- valores iniciales (después se cambian desde el panel) ----------
export const DEFAULT_CONFIG: Config = {
  name: "M10 Canchas de Fútbol",
  slogan: "Tenemos historia, tenemos presente",
  description: "Alquiler de canchas de fútbol 5, 7, 9 y 11. Reservá tu turno online en un minuto.",
  address: "",
  mapsUrl: "",
  whatsapp: "",
  instagram: "",
  hours: "Todos los días",
  notice: "",
  bookingNote: "El turno se paga en el complejo. Si no podés venir, avisá con tiempo.",
  services: [
    { title: "Canchas 5, 7, 9 y 11", text: "Elegí el tamaño que necesites y reservá online." },
    { title: "Eventos y cumpleaños", text: "Festejá con nosotros. Consultanos por WhatsApp." },
    { title: "Alquiler del espacio deportivo", text: "Para torneos, escuelitas y empresas." },
    { title: "Estacionamiento", text: "Vení tranquilo, tenés lugar para dejar el auto." },
  ],
  nightFrom: 19 * 60,
  daysAhead: 14,
  cancelHours: 3,
  open: true,
  logoV: 0,
  coverV: 0,
};

const court = (id: string, name: string, tipo: Tipo): Court => ({ id, name, tipo, detail: "", dur: 60, open: 9 * 60, close: 24 * 60, priceDay: 0, priceNight: 0, shares: [], active: true });
export const DEFAULT_COURTS: Court[] = [court("c1", "Cancha 1", 5), court("c2", "Cancha 2", 5), court("c3", "Cancha de 7", 7), court("c4", "Cancha de 9", 9), court("c5", "Cancha de 11", 11)];

const K = {
  day: (date: string) => `res:${date}`,
  skip: (date: string) => `fskip:${date}`,
  rid: (id: string) => `rid:${id}`,
};

export class BookingError extends Error {}

export function newId(prefix: string) {
  const rnd = crypto.getRandomValues(new Uint8Array(9));
  return prefix + "_" + Array.from(rnd, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
}
export function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- configuración y canchas ----------
/** Lee configuración y canchas en un solo comando */
export async function getSite(): Promise<{ config: Config; courts: Court[] }> {
  const [c, k] = await kv.mget<unknown>(["config", "courts"]);
  return { config: { ...DEFAULT_CONFIG, ...((c as Partial<Config>) ?? {}) }, courts: (k as Court[] | null) ?? DEFAULT_COURTS };
}
export const saveConfig = (c: Config) => kv.set("config", c);
export async function saveCourts(courts: Court[]) {
  await kv.set("courts", courts);
  await touch();
}

export function slotsOf(c: Court): number[] {
  const out: number[] = [];
  for (let t = c.open; t + c.dur <= c.close; t += c.dur) out.push(t);
  return out;
}
export const priceOf = (c: Court, start: number, nightFrom: number) => (start >= nightFrom ? c.priceNight || c.priceDay : c.priceDay);

/** La cancha más todas las que comparten su espacio */
export function conflictIds(c: Court, courts: Court[]) {
  const s = new Set([c.id, ...c.shares]);
  for (const o of courts) if (o.shares.includes(c.id)) s.add(o.id);
  return s;
}
export function isBusy(bookings: Booking[], ids: Set<string>, start: number, dur: number) {
  return bookings.some((b) => ids.has(b.courtId) && b.start < start + dur && start < b.start + b.dur);
}

// ---------- cambios en vivo (el panel pregunta si cambió algo) ----------
export async function touch() {
  await kv.set("ver", "v" + Date.now() + Math.floor(Math.random() * 1000));
}
export async function getLive() {
  const [v, last] = await kv.mget<unknown>(["ver", "last"]);
  return { v: v == null ? "0" : String(v), last: (last as LastBooking | null) ?? null };
}

// ---------- turnos ----------
export async function getFijos(): Promise<Fijo[]> {
  return (await kv.get<Fijo[]>("fijos")) ?? [];
}

export async function dayBookings(date: string, courts: Court[], nightFrom: number, fijosIn?: Fijo[]): Promise<Booking[]> {
  const [res, fijos, skips] = await Promise.all([kv.hgetall<Reserva>(K.day(date)), fijosIn ?? getFijos(), kv.smembers(K.skip(date))]);
  const out: Booking[] = Object.values(res).map((r) => ({ id: r.id, courtId: r.courtId, start: r.start, dur: r.dur, name: r.name, phone: r.phone, origin: r.origin, price: r.price }));
  const dow = dayOfWeek(date);
  for (const f of fijos) {
    if (f.dow !== dow || date < f.since || skips.includes(f.id)) continue;
    const c = courts.find((x) => x.id === f.courtId);
    if (!c) continue;
    out.push({ id: f.id, courtId: f.courtId, start: f.start, dur: f.dur, name: f.name, phone: f.phone, origin: "fijo", price: priceOf(c, f.start, nightFrom) });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Candado corto por día: evita que dos personas reserven lo mismo a la vez */
async function withLock<T>(date: string, fn: () => Promise<T>): Promise<T> {
  const key = `mx:${date}`;
  let got = false;
  for (let i = 0; i < 30 && !got; i++) {
    got = await kv.set(key, "1", { nx: true, ex: 10 });
    if (!got) await new Promise((r) => setTimeout(r, 120));
  }
  if (!got) throw new BookingError("Hay mucha gente reservando. Probá de nuevo en unos segundos.");
  try {
    return await fn();
  } finally {
    await kv.del(key);
  }
}

type NewReserva = { courtId?: string; tipo?: Tipo; date: string; start: number; name: string; phone: string; origin: Reserva["origin"] };

/**
 * Crea una reserva. Desde la web se pide por tamaño de cancha (tipo) y el sistema
 * asigna la primera cancha libre de ese tamaño. Desde el panel se elige la cancha.
 */
export async function createReserva(input: NewReserva, staff = false): Promise<Reserva> {
  const { config, courts } = await getSite();
  if (!staff) {
    if (!config.open) throw new BookingError("Las reservas online están pausadas. Escribinos por WhatsApp.");
    const today = todayStr();
    if (input.date < today || minutesUntil(input.date, input.start) <= 0) throw new BookingError("Ese horario ya pasó.");
    if (input.date > addDays(today, config.daysAhead)) throw new BookingError(`Solo se puede reservar hasta ${config.daysAhead} días antes.`);
  }
  const candidates = input.courtId ? courts.filter((c) => c.id === input.courtId) : courts.filter((c) => c.active && c.tipo === input.tipo);
  if (!candidates.length) throw new BookingError("La cancha no existe.");

  return withLock(input.date, async () => {
    const bookings = await dayBookings(input.date, courts, config.nightFrom);
    if (!staff && input.phone && bookings.filter((b) => b.phone === input.phone).length >= 2) {
      throw new BookingError("Ya tenés 2 turnos ese día. Para reservar más escribinos por WhatsApp.");
    }
    const c = candidates.find((k) => slotsOf(k).includes(input.start) && !isBusy(bookings, conflictIds(k, courts), input.start, k.dur));
    if (!c) throw new BookingError("Ese turno ya está ocupado. Elegí otro horario.");
    const r: Reserva = {
      id: newId("r"),
      courtId: c.id,
      date: input.date,
      start: input.start,
      dur: c.dur,
      name: input.name,
      phone: input.phone,
      origin: input.origin,
      price: input.origin === "bloqueo" ? 0 : priceOf(c, input.start, config.nightFrom),
      token: newToken(),
      createdAt: Date.now(),
    };
    await kv.hset(K.day(r.date), r.id, r);
    await kv.set(K.rid(r.id), r.date, { ex: 60 * 60 * 24 * 200 });
    if (r.origin === "web") {
      const last: LastBooking = { name: r.name, date: r.date, start: r.start, at: Date.now() };
      await kv.set("last", last, { ex: 60 * 60 * 24 });
    }
    await touch();
    return r;
  });
}

export async function findReserva(id: string): Promise<Reserva | null> {
  const date = await kv.get<string>(K.rid(id));
  return date ? kv.hget<Reserva>(K.day(String(date)), id) : null;
}

export async function cancelReserva(date: string, id: string) {
  const r = await kv.hget<Reserva>(K.day(date), id);
  if (!r) return false;
  await kv.hdel(K.day(date), id);
  await kv.del(K.rid(id));
  await touch();
  return true;
}

// ---------- turnos fijos (todas las semanas) ----------
export async function addFijo(input: { courtId: string; date: string; start: number; name: string; phone: string }) {
  const { config, courts } = await getSite();
  const c = courts.find((x) => x.id === input.courtId);
  if (!c) throw new BookingError("La cancha no existe.");
  const ids = conflictIds(c, courts);
  const fijos = await getFijos();
  const dow = dayOfWeek(input.date);
  if (fijos.some((f) => f.dow === dow && ids.has(f.courtId) && f.start < input.start + c.dur && input.start < f.start + f.dur)) {
    throw new BookingError("Ya hay un turno fijo en ese día y horario.");
  }
  for (let w = 0; w * 7 <= config.daysAhead + 7; w++) {
    const d = addDays(input.date, w * 7);
    const res = Object.values(await kv.hgetall<Reserva>(K.day(d)));
    const clash = res.find((r) => ids.has(r.courtId) && r.start < input.start + c.dur && input.start < r.start + r.dur);
    if (clash) throw new BookingError(`El ${d.split("-").reverse().join("/")} ese horario ya lo tiene ${clash.name}. Cancelá ese turno primero.`);
  }
  const f: Fijo = { id: newId("f"), courtId: c.id, dow, start: input.start, dur: c.dur, name: input.name, phone: input.phone, since: input.date };
  await kv.set("fijos", [...fijos, f]);
  await touch();
  return f;
}

export async function removeFijo(id: string) {
  await kv.set("fijos", (await getFijos()).filter((f) => f.id !== id));
  await touch();
}

/** Libera un turno fijo solo por un día */
export async function skipFijo(date: string, id: string) {
  await kv.sadd(K.skip(date), id);
  await touch();
}

// ---------- imágenes (logo y portada) ----------
export type ImgKind = "logo" | "cover";
export const getImage = (kind: ImgKind) => kv.get<string>(`img:${kind}`);
export const saveImage = (kind: ImgKind, dataUrl: string) => kv.set(`img:${kind}`, dataUrl);
export const deleteImage = (kind: ImgKind) => kv.del(`img:${kind}`);
