import { after } from "next/server";
import { fail, handle, ok, str } from "@/lib/api";
import { cancelReserva, findFijo, findReservaFresh, getSite, nextFijoDates, removeFijo, skipFijo } from "@/lib/data";
import { notifyAll } from "@/lib/push";
import { cap, DOW_NAMES, fmtLong, hm, minutesUntil, todayStr } from "@/lib/time";

/**
 * El cliente cancela con el link que recibió.
 * - Reserva común: la cancela.
 * - Turno fijo: scope "semana" libera solo la fecha indicada; scope "siempre" lo da de baja.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = str((await params).id, 40);
    const b = await req.json().catch(() => ({}));
    const { config } = await getSite();
    const when = (d: string) => (d === todayStr() ? "hoy" : cap(fmtLong(d)));

    if (id.startsWith("f_")) {
      const f = await findFijo(id);
      if (!f || !f.web || f.token !== String(b.token ?? "")) return fail("No encontramos ese turno fijo.", 404);
      if (b.scope === "siempre") {
        await removeFijo(f.id);
        after(() => notifyAll({ title: "Turno fijo dado de baja", body: `${f.name} dejó su turno de los ${DOW_NAMES[f.dow]} ${hm(f.start)} hs. El horario quedó libre.`, url: "/panel", tag: f.id }));
        return ok();
      }
      const date = String(b.date ?? "");
      if (!(await nextFijoDates(f, 3)).includes(date)) return fail("Esa fecha no corresponde a tu turno fijo.");
      if (minutesUntil(date, f.start) < config.cancelHours * 60) return fail(`Faltan menos de ${config.cancelHours} hs: para avisar escribinos por WhatsApp.`);
      await skipFijo(date, f.id);
      after(() => notifyAll({ title: "Turno fijo: no viene esta semana", body: `${f.name} no viene ${when(date)} ${hm(f.start)} hs. El horario quedó libre.`, url: `/panel?d=${date}`, tag: f.id + date }));
      return ok();
    }

    const r = await findReservaFresh(id);
    if (!r || r.token !== String(b.token ?? "")) return fail("No encontramos esa reserva.", 404);
    if (minutesUntil(r.date, r.start) < config.cancelHours * 60) return fail("Ya no se puede cancelar online. Escribinos por WhatsApp.");
    await cancelReserva(r.date, r.id, r);
    after(() =>
      notifyAll({
        title: "Turno cancelado",
        body: `${r.name} canceló · ${when(r.date)} ${hm(r.start)} hs. El horario quedó libre.`,
        url: `/panel?d=${r.date}`,
        tag: r.id,
      }),
    );
    return ok();
  } catch (e) {
    return handle(e);
  }
}
