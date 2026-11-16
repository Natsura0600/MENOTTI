import { handle, ok, str } from "@/lib/api";
import { findReserva } from "@/lib/data";
import { minutesUntil } from "@/lib/time";

/**
 * El celular guarda "mis reservas" para mostrarlas en la portada. Acá pregunta cuáles siguen en pie:
 * las que canceló el jugador, las que canceló el complejo desde el panel y las que ya pasaron no vuelven.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 5) as Record<string, unknown>[];
    const found = await Promise.all(
      items.map(async (it) => {
        const id = str(it?.id, 40);
        const r = id ? await findReserva(id) : null;
        // Sin el código secreto de la reserva no se informa nada
        if (!r || r.token !== String(it?.token ?? "")) return null;
        return minutesUntil(r.date, r.start + r.dur) > 0 ? r.id : null;
      }),
    );
    return ok({ ids: found.filter(Boolean) });
  } catch (e) {
    return handle(e);
  }
}
