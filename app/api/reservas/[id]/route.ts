import { fail, handle, ok, str } from "@/lib/api";
import { cancelReserva, findReserva, getSite } from "@/lib/data";
import { minutesUntil } from "@/lib/time";

/** El jugador cancela su reserva con el link que recibió */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const r = await findReserva(str(id, 40));
    if (!r || r.token !== String(b.token ?? "")) return fail("No encontramos esa reserva.", 404);
    const { config } = await getSite();
    if (minutesUntil(r.date, r.start) < config.cancelHours * 60) return fail("Ya no se puede cancelar online. Escribinos por WhatsApp.");
    await cancelReserva(r.date, r.id);
    return ok();
  } catch (e) {
    return handle(e);
  }
}
