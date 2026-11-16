import { fail, handle, ok } from "@/lib/api";
import { conflictIds, dayBookings, getSite, isBusy, priceOf, slotsOf } from "@/lib/data";
import { addDays, isValidDate, nowMinutes, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Horarios de un día para una cancha. Tiene en cuenta las canchas que comparten su espacio. */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const date = u.searchParams.get("date") ?? "";
    const courtId = u.searchParams.get("court") ?? "";
    if (!isValidDate(date)) return fail("Fecha inválida.");
    const { config, courts } = await getSite();
    const today = todayStr();
    if (date < today || date > addDays(today, config.daysAhead)) return fail("Fecha fuera del rango de reservas.");
    const c = courts.find((k) => k.active && k.id === courtId);
    if (!c) return ok({ date, slots: [] });
    const bookings = await dayBookings(date, courts, config.nightFrom);
    const now = date === today ? nowMinutes() : -1;
    const ids = conflictIds(c, courts);
    const slots = slotsOf(c)
      .filter((t) => t > now)
      .map((t) => ({ start: t, dur: c.dur, price: priceOf(c, t, config.nightFrom), free: !isBusy(bookings, ids, t, c.dur) }));
    // No se exponen nombres ni teléfonos: solo libre u ocupado.
    return ok({ date, slots });
  } catch (e) {
    return handle(e);
  }
}
