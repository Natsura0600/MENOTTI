import { cleanPhone, denied, fail, handle, ok, str } from "@/lib/api";
import { addFijo, cancelReserva, createReserva, removeFijo, skipFijo } from "@/lib/data";
import { isValidDate } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const type = String(b.type);
    const date = String(b.date ?? "");
    const start = Number(b.start);
    const name = str(b.name, 60) || (type === "bloqueo" ? "Bloqueado" : "");
    const phone = cleanPhone(b.phone);
    const courtId = str(b.courtId, 40);
    if (!isValidDate(date) || !Number.isInteger(start)) return fail("Elegí día y horario.");
    if (!name) return fail("Poné un nombre para identificar el turno.");
    if (type === "fijo") return ok({ id: (await addFijo({ courtId, date, start, name, phone })).id });
    if (type !== "manual" && type !== "bloqueo") return fail("Tipo de turno inválido.");
    const r = await createReserva({ courtId, date, start, name, phone, origin: type }, true);
    return ok({ id: r.id });
  } catch (e) {
    return handle(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const id = str(b.id, 40);
    const date = String(b.date ?? "");
    if (!isValidDate(date)) return fail("Fecha inválida.");
    if (b.origin === "fijo") {
      if (b.scope === "siempre") await removeFijo(id);
      else await skipFijo(date, id);
      return ok();
    }
    if (!(await cancelReserva(date, id))) return fail("Ese turno ya no existe.", 404);
    return ok();
  } catch (e) {
    return handle(e);
  }
}
