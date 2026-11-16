import { denied, fail, handle, int, ok, str } from "@/lib/api";
import { newId, saveCourts } from "@/lib/data";
import { TIPOS, type Court, type Tipo } from "@/lib/types";

/** Guarda la lista completa de canchas */
export async function PUT(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    if (!Array.isArray(b.courts) || b.courts.length > 30) return fail("Lista de canchas inválida.");
    const raw = b.courts as Record<string, unknown>[];
    const courts: Court[] = raw.map((c) => {
      const tipo = Number(c.tipo) as Tipo;
      const open = int(c.open, 0, 1410, 540);
      return {
        id: str(c.id, 40) || newId("c"),
        name: str(c.name, 40) || "Cancha",
        tipo: TIPOS.includes(tipo) ? tipo : 7,
        detail: str(c.detail, 60),
        dur: int(c.dur, 30, 180, 60),
        open,
        close: int(c.close, open + 30, 1440, 1440),
        priceDay: int(c.priceDay, 0, 100000000, 0),
        priceNight: int(c.priceNight, 0, 100000000, 0),
        shares: Array.isArray(c.shares) ? c.shares.map((s) => String(s)) : [],
        active: c.active !== false,
      };
    });
    const ids = new Set(courts.map((c) => c.id));
    if (ids.size !== courts.length) return fail("Hay canchas repetidas.");
    for (const c of courts) c.shares = [...new Set(c.shares)].filter((s) => s !== c.id && ids.has(s));
    await saveCourts(courts);
    return ok({ courts });
  } catch (e) {
    return handle(e);
  }
}
