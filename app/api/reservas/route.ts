import { after } from "next/server";
import { cleanPhone, fail, handle, ok, str, tooMany } from "@/lib/api";
import { createReserva } from "@/lib/data";
import { notifyAll } from "@/lib/push";
import { cap, fmtLong, hm, isValidDate, todayStr } from "@/lib/time";
import { TIPOS, type Tipo } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const name = str(b.name, 60);
    const phone = cleanPhone(b.phone);
    const date = String(b.date ?? "");
    const start = Number(b.start);
    const tipo = Number(b.tipo) as Tipo;
    if (name.length < 3) return fail("Poné tu nombre y apellido.");
    if (phone.length < 10) return fail("Poné tu WhatsApp con código de área (ej: 11 5555 0000).");
    if (!isValidDate(date) || !Number.isInteger(start) || !TIPOS.includes(tipo)) return fail("Elegí un horario válido.");
    // Como mucho 8 reservas cada 10 minutos desde la misma conexión
    if (tooMany(req, "reserva", 8, 600)) return fail("Hiciste muchas reservas seguidas. Esperá unos minutos o escribinos por WhatsApp.", 429);
    const r = await createReserva({ tipo, date, start, name, phone, origin: "web" });
    // El aviso al celular del complejo sale después de responderle al cliente: no lo hace esperar
    after(() =>
      notifyAll({
        title: `Nueva reserva · Fútbol ${tipo}`,
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
