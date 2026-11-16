import { bust, bustAll, cached, TAG } from "./cache";
import { kv } from "./kv";
import { addDays, dayOfWeek, minutesUntil, todayStr } from "./time";
import { TIPOS, type Booking, type Caja, type Config, type Court, type Fijo, type Item, type LastBooking, type Product, type Reserva, type Tipo } from "./types";

// ---------- valores iniciales (después se cambian desde el panel) ----------
export const DEFAULT_CONFIG: Config = {
  name: "M10 Canchas de Fútbol",
  slogan: "Tenemos historia, tenemos presente",
  description: "Alquiler de canchas de fútbol 7, 9 y 11. Reservá tu turno online en un minuto.",
  address: "",
  mapsUrl: "",
  whatsapp: "",
  instagram: "",
  hours: "Todos los días",
  notice: "",
  bookingNote: "El turno se paga en el complejo. Si no podés venir, avisá con tiempo.",
  services: [
    { title: "Canchas 7, 9 y 11", text: "Elegí el tamaño que necesites y reservá online." },
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
  photos: [],
};

const court = (id: string, name: string, tipo: Tipo): Court => ({ id, name, tipo, detail: "", dur: 60, open: 9 * 60, close: 24 * 60, priceDay: 0, priceNight: 0, shares: [], active: true });
export const DEFAULT_COURTS: Court[] = [court("c3", "Cancha de 7", 7), court("c4", "Cancha de 9", 9), court("c5", "Cancha de 11", 11)];

const K = {
  day: (date: string) => `res:${date}`,
  caja: (date: string) => `caja:${date}`,
  skip: (date: string) => `fskip:${date}`,
  rid: (id: string) => `rid:${id}`,
};

export class BookingError extends Error {}

export function newId(prefix: string) {
  const rnd = crypto.getRandomValues(new Uint8Array(9));
  return prefix + "_" + Array.from(rnd, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
}
/** El id de una reserva lleva su fecha (r_20261118_xxxx): así se la encuentra sin guardar un índice aparte */
const reservaId = (date: string) => `r_${date.replace(/-/g, "")}_${newId("x").slice(2, 14)}`;
function dateOfId(id: string): string | null {
  const m = /^r_(\d{4})(\d{2})(\d{2})_/.exec(id);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
export function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- configuración y canchas ----------
/** Lee configuración y canchas directo de la base, en un solo comando. Usar siempre antes de escribir. */
export async function getSiteFresh(): Promise<{ config: Config; courts: Court[] }> {
  const [c, k] = await kv.mget<unknown>(["config", "courts"]);
  // Se descartan canchas guardadas de un tamaño que ya no se ofrece (ej: fútbol 5)
  const courts = ((k as Court[] | null) ?? DEFAULT_COURTS).filter((x) => TIPOS.includes(x.tipo));
  return { config: { ...DEFAULT_CONFIG, ...((c as Partial<Config>) ?? {}) }, courts };
}
/** Igual, pero desde la caché: no gasta comandos mientras nadie cambie nada. Para todo lo que solo muestra. */
export const getSite = () => cached(["site"], [TAG.site], 86400, getSiteFresh);

export async function saveConfig(c: Config) {
  await kv.set("config", c);
  bust(TAG.site);
}
export async function saveCourts(courts: Court[]) {
  await kv.set("courts", courts);
  bust(TAG.site);
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
/**
 * "Versión" de los datos: cambia cada vez que algo se modifica. No vive en la base sino en la caché:
 * touch() la invalida y la próxima consulta genera una nueva. Marcar un cambio no gasta comandos.
 */
const getVersion = () => cached(["ver"], [TAG.live], 21600, async () => "v" + Date.now() + Math.floor(Math.random() * 1000));
/** Última reserva hecha por la web (para que el panel suene y avise). Solo se lee de la base cuando entra una nueva. */
const getLast = () => cached(["last"], [TAG.last], 86400, async () => (await kv.get<LastBooking>("last")) ?? null);

export async function touch(last?: LastBooking) {
  if (last) {
    await kv.set("last", last, { ex: 60 * 60 * 24 });
    bust(TAG.last);
  }
  bust(TAG.live);
}
/** El panel pregunta esto cada minuto: sale de la caché */
export async function getLive() {
  const [v, last] = await Promise.all([getVersion(), getLast()]);
  return { v, last: last && Date.now() - last.at < 86400000 ? last : null };
}

// ---------- turnos ----------
export async function getFijosFresh(): Promise<Fijo[]> {
  return (await kv.get<Fijo[]>("fijos")) ?? [];
}
export const getFijos = () => cached(["fijos"], [TAG.fijos], 86400, getFijosFresh);
async function saveFijos(fijos: Fijo[]) {
  await kv.set("fijos", fijos);
  bust(TAG.fijos);
}


type DayRaw = { res: Reserva[]; skips: string[] };
/** Los "fijos liberados" de un día solo se leen si existe algún turno fijo: sin fijos no hay nada que liberar */
async function dayRawFresh(date: string, hasFijos: boolean): Promise<DayRaw> {
  const [res, skips] = await Promise.all([kv.hgetall<Reserva>(K.day(date)), hasFijos ? kv.smembers(K.skip(date)) : []]);
  return { res: Object.values(res), skips };
}
const dayRaw = (date: string, hasFijos: boolean) => cached(["day", date, hasFijos ? "f" : "-"], [TAG.day(date)], 3600, () => dayRawFresh(date, hasFijos));

/**
 * Turnos de un día (reservas + turnos fijos).
 * fresh=true lee directo de la base (solo al reservar, con el candado puesto); si no, usa la caché,
 * que se invalida en el acto cada vez que se reserva, se cancela o se libera un turno.
 */
export async function dayBookings(date: string, courts: Court[], nightFrom: number, fresh = false): Promise<Booking[]> {
  const fijos = await (fresh ? getFijosFresh() : getFijos());
  const { res, skips } = await (fresh ? dayRawFresh(date, fijos.length > 0) : dayRaw(date, fijos.length > 0));
  const out: Booking[] = res.map((r) => ({ id: r.id, courtId: r.courtId, start: r.start, dur: r.dur, name: r.name, phone: r.phone, origin: r.origin, price: r.price }));
  const dow = dayOfWeek(date);
  for (const f of fijos) {
    if (f.dow !== dow || date < f.since || skips.includes(f.id)) continue;
    const c = courts.find((x) => x.id === f.courtId);
    if (!c) continue;
    out.push({ id: f.id, courtId: f.courtId, start: f.start, dur: f.dur, name: f.name, phone: f.phone, origin: "fijo", price: priceOf(c, f.start, nightFrom), habitual: f.items });
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
    const bookings = await dayBookings(input.date, courts, config.nightFrom, true);
    if (!staff && input.phone && bookings.filter((b) => b.phone === input.phone).length >= 2) {
      throw new BookingError("Ya tenés 2 turnos ese día. Para reservar más escribinos por WhatsApp.");
    }
    const c = candidates.find((k) => slotsOf(k).includes(input.start) && !isBusy(bookings, conflictIds(k, courts), input.start, k.dur));
    if (!c) throw new BookingError("Ese turno ya está ocupado. Elegí otro horario.");
    const r: Reserva = {
      id: reservaId(input.date),
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
    bust(TAG.day(r.date));
    await touch(r.origin === "web" ? { name: r.name, date: r.date, start: r.start, at: Date.now() } : undefined);
    return r;
  });
}

/** Fecha de una reserva a partir de su id (las reservas viejas la tienen en un índice aparte) */
async function dateOf(id: string): Promise<string | null> {
  const d = dateOfId(id) ?? (await kv.get<string>(K.rid(id)));
  return d ? String(d) : null;
}
/** Busca una reserva para mostrarla (desde la caché del día: normalmente no gasta comandos) */
export async function findReserva(id: string): Promise<Reserva | null> {
  const date = await dateOf(id);
  if (!date) return null;
  return (await dayRaw(date, (await getFijos()).length > 0)).res.find((r) => r.id === id) ?? null;
}
/** Igual, pero directo de la base: para cancelar */
export async function findReservaFresh(id: string): Promise<Reserva | null> {
  const date = await dateOf(id);
  return date ? kv.hget<Reserva>(K.day(date), id) : null;
}

/** Cancela una reserva. Si ya se la leyó de la base (known), no la vuelve a leer. */
export async function cancelReserva(date: string, id: string, known?: Reserva) {
  const r = known ?? (await kv.hget<Reserva>(K.day(date), id));
  if (!r) return false;
  const had = !!(await getCajaDay(date))[id];
  await Promise.all([kv.hdel(K.day(date), id), had ? kv.hdel(K.caja(date), id) : null, dateOfId(id) ? null : kv.del(K.rid(id))]);
  bust(TAG.day(date), TAG.caja(date));
  await touch();
  return true;
}

// ---------- turnos fijos (todas las semanas) ----------
export async function addFijo(input: { courtId: string; date: string; start: number; name: string; phone: string }) {
  const { config, courts } = await getSiteFresh();
  const c = courts.find((x) => x.id === input.courtId);
  if (!c) throw new BookingError("La cancha no existe.");
  const ids = conflictIds(c, courts);
  const fijos = await getFijosFresh();
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
  await saveFijos([...fijos, f]);
  await touch();
  return f;
}

export async function removeFijo(id: string) {
  await saveFijos((await getFijosFresh()).filter((f) => f.id !== id));
  await touch();
}

/** Consumo habitual de un turno fijo: se precarga solo cada semana */
export async function setFijoItems(id: string, items: Item[]) {
  const fijos = await getFijosFresh();
  if (!fijos.some((f) => f.id === id)) return false;
  await saveFijos(fijos.map((f) => (f.id === id ? { ...f, items } : f)));
  await touch();
  return true;
}

/** Libera un turno fijo solo por un día */
export async function skipFijo(date: string, id: string) {
  await kv.sadd(K.skip(date), id);
  bust(TAG.day(date));
  await touch();
}

// ---------- caja ----------
export const DEFAULT_PRODUCTS: Product[] = [
  { id: "p_cerveza", name: "Cerveza", price: 0, active: true },
  { id: "p_gaseosa", name: "Gaseosa", price: 0, active: true },
  { id: "p_agua", name: "Agua", price: 0, active: true },
  { id: "p_isotonica", name: "Bebida isotónica", price: 0, active: true },
];
export const getProductsFresh = async () => (await kv.get<Product[]>("products")) ?? DEFAULT_PRODUCTS;
export const getProducts = () => cached(["products"], [TAG.products], 86400, getProductsFresh);
export async function saveProducts(products: Product[]) {
  await kv.set("products", products);
  bust(TAG.products);
}

/** Caja de todos los turnos de un día: bebidas y quién pagó (con caché; se invalida al guardar) */
export const getCajaDay = (date: string) => cached(["caja", date], [TAG.caja(date)], 3600, () => kv.hgetall<Caja>(K.caja(date)));
export async function saveCaja(date: string, bookingId: string, caja: Caja) {
  await kv.hset(K.caja(date), bookingId, caja);
  bust(TAG.caja(date));
  await touch();
}

// ---------- imágenes (logo y portada) ----------
/** kind: "logo", "cover" o "foto_<id>" (fotos de las canchas) */
export const getImage = (kind: string) => kv.get<string>(`img:${kind}`);
export const saveImage = (kind: string, dataUrl: string) => kv.set(`img:${kind}`, dataUrl);
export const deleteImage = (kind: string) => kv.del(`img:${kind}`);

// ---------- mantenimiento ----------
/**
 * Vacía datos de la base y descarta la caché, todo junto (borrar solo en Upstash deja la copia en caché a la vista).
 * - "turnos": reservas, turnos fijos y caja. Quedan canchas, precios, textos, productos, fotos y usuarios.
 * - "todo": además vuelve canchas, textos, productos y fotos a los valores de fábrica. Los usuarios no se tocan.
 */
export async function wipe(scope: "turnos" | "todo") {
  const prefixes = ["res:", "caja:", "fskip:", "rid:", "mx:"];
  const single = ["fijos", "last", "live", "ver"];
  if (scope === "todo") {
    prefixes.push("img:");
    single.push("config", "courts", "products", "push");
  }
  const found = (await Promise.all(prefixes.map((p) => kv.keys(p)))).flat();
  const all = [...new Set([...found, ...single])];
  for (let i = 0; i < all.length; i += 200) await kv.del(...all.slice(i, i + 200));
  bustAll();
  return found.length;
}
