import { denied, fail, handle, ok } from "@/lib/api";
import { dayBookings, getCajaDay, getLive, getSite } from "@/lib/data";
import { isValidDate } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Agenda de un día para el panel: turnos + caja de cada turno. Sale de la caché, que se invalida con cada cambio. */
export async function GET(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    const date = new URL(req.url).searchParams.get("date") ?? "";
    if (!isValidDate(date)) return fail("Fecha inválida.");
    const [{ config, courts }, live] = await Promise.all([getSite(), getLive()]);
    const [bookings, caja] = await Promise.all([dayBookings(date, courts, config.nightFrom), getCajaDay(date)]);
    return ok({ date, v: live.v, courts, bookings, caja });
  } catch (e) {
    return handle(e);
  }
}
