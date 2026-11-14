import { cleanPhone, fail, handle, ok, str } from "@/lib/api";
import { createReserva } from "@/lib/data";
import { isValidDate } from "@/lib/time";
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
    const r = await createReserva({ tipo, date, start, name, phone, origin: "web" });
    return ok({ id: r.id, token: r.token });
  } catch (e) {
    return handle(e);
  }
}
