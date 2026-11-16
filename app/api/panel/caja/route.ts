import { denied, fail, handle, int, ok, str } from "@/lib/api";
import { getCajaDay, getFijos, getProducts, saveCaja, setFijoItems } from "@/lib/data";
import { isValidDate } from "@/lib/time";
import type { Caja, Item } from "@/lib/types";

const isFijo = (id: string) => id.startsWith("f_");

/**
 * Guarda la caja de un turno: bebidas y quién pagó. Lo pueden usar el dueño y el empleado.
 * Los precios nunca vienen del celular: salen de lo ya guardado en ese turno o de la lista de productos.
 * Con habitual=true (turnos fijos) deja esas bebidas como consumo de todas las semanas.
 */
export async function PUT(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const date = String(b.date ?? "");
    const id = str(b.id, 40);
    if (!isValidDate(date) || !id) return fail("Turno inválido.");

    const [products, day] = await Promise.all([getProducts(), getCajaDay(date)]);
    const known = new Map<string, { name: string; price: number }>();
    for (const p of products) known.set(p.id, { name: p.name, price: p.price });
    // en un turno fijo, el consumo habitual también es válido aunque el producto ya no esté en la lista
    if (isFijo(id)) for (const it of (await getFijos()).find((f) => f.id === id)?.items ?? []) if (!known.has(it.id)) known.set(it.id, { name: it.name, price: it.price });
    for (const it of day[id]?.items ?? []) known.set(it.id, { name: it.name, price: it.price }); // lo ya cargado conserva su precio

    const items: Item[] = [];
    for (const raw of (Array.isArray(b.items) ? b.items : []).slice(0, 60) as Record<string, unknown>[]) {
      const pid = str(raw.id, 40);
      const qty = int(raw.qty, 0, 999, 0);
      const k = known.get(pid);
      if (!k || qty <= 0 || items.some((x) => x.id === pid)) continue;
      items.push({ id: pid, name: k.name, price: k.price, qty });
    }
    const players = ((Array.isArray(b.players) ? b.players : []).slice(0, 30) as Record<string, unknown>[]).map((p) => ({ name: str(p.name, 30), paid: !!p.paid }));
    const caja: Caja = { items, players, drinksPaid: !!b.drinksPaid && items.length > 0, note: str(b.note, 200) };

    await saveCaja(date, id, caja);
    if (b.habitual === true && isFijo(id)) await setFijoItems(id, items);
    return ok({ caja });
  } catch (e) {
    return handle(e);
  }
}
