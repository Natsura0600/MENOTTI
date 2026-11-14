import { fail, handle, ok } from "@/lib/api";
import { conflictIds, dayBookings, getSite, isBusy, priceOf, slotsOf } from "@/lib/data";
import { addDays, isValidDate, nowMinutes, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Horarios de un día para un tamaño de cancha. Un horario está libre si queda al menos una cancha de ese tamaño. */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const date = u.searchParams.get("date") ?? "";
    const tipo = Number(u.searchParams.get("tipo"));
    if (!isValidDate(date)) return fail("Fecha inválida.");
    const { config, courts } = await getSite();
    const today = todayStr();
    if (date < today || date > addDays(today, config.daysAhead)) return fail("Fecha fuera del rango de reservas.");
    const bookings = await dayBookings(date, courts, config.nightFrom);
    const now = date === today ? nowMinutes() : -1;
    const slots = new Map<number, { start: number; dur: number; price: number; free: boolean }>();
    for (const c of courts.filter((k) => k.active && k.tipo === tipo)) {
      const ids = conflictIds(c, courts);
      for (const t of slotsOf(c)) {
        if (t <= now) continue;
        const free = !isBusy(bookings, ids, t, c.dur);
        const prev = slots.get(t);
        if (!prev || (free && !prev.free)) slots.set(t, { start: t, dur: c.dur, price: priceOf(c, t, config.nightFrom), free });
      }
    }
    // No se exponen nombres ni teléfonos: solo libre u ocupado.
    return ok({ date, slots: [...slots.values()].sort((a, b) => a.start - b.start) });
  } catch (e) {
    return handle(e);
  }
}
