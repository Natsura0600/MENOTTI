import { after } from "next/server";
import { cleanPhone, fail, handle, ok, str, tooMany } from "@/lib/api";
import { addFijo, createReserva, getSite } from "@/lib/data";
import { notifyAll } from "@/lib/push";
import { cap, DOW_NAMES, fmtLong, hm, isValidDate, todayStr } from "@/lib/time";

/** Reserva desde la web. Con repeat=true queda como turno fijo: el mismo día y horario todas las semanas. */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const name = str(b.name, 60);
    const phone = cleanPhone(b.phone);
    const date = String(b.date ?? "");
    const start = Number(b.start);
    const courtId = str(b.courtId, 40);
    const repeat = b.repeat === true;
    if (name.length < 3) return fail("Poné tu nombre y apellido.");
    if (phone.length < 10) return fail("Poné tu WhatsApp con código de área (ej: 11 5555 0000).");
    if (!isValidDate(date) || !Number.isInteger(start) || !courtId) return fail("Elegí una cancha y un horario.");
    const court = (await getSite()).courts.find((c) => c.active && c.id === courtId);
    if (!court) return fail("Esa cancha no está disponible. Recargá la página.");
    // Como mucho 8 reservas cada 10 minutos desde la misma conexión
    if (tooMany(req, "reserva", 8, 600)) return fail("Hiciste muchas reservas seguidas. Esperá unos minutos o escribinos por WhatsApp.", 429);

    if (repeat) {
      const f = await addFijo({ courtId, date, start, name, phone }, true);
      after(() =>
        notifyAll({
          title: `Nuevo turno fijo · ${court.name}`,
          body: `${f.name} · todos los ${DOW_NAMES[f.dow]} ${hm(f.start)} hs (empieza ${f.since === todayStr() ? "hoy" : cap(fmtLong(f.since))})`,
          url: `/panel?d=${f.since}`,
          tag: f.id,
        }),
      );
      return ok({ id: f.id, token: f.token });
    }

    const r = await createReserva({ courtId, date, start, name, phone, origin: "web" });
    // El aviso al celular del complejo sale después de responderle al cliente: no lo hace esperar
    after(() =>
      notifyAll({
        title: `Nueva reserva · ${court.name}`,
        body: `${r.name} · ${r.date === todayStr() ? "Hoy" : cap(fmtLong(r.date))} ${hm(r.start)} hs`,
        url: `/panel?d=${r.date}`,
        tag: r.id,
      }),
    );
    return ok({ id: r.id, token: r.token });
  } catch (e) {
    return handle(e);
  }
}
