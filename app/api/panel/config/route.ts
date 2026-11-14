import { cleanPhone, denied, handle, int, ok, str } from "@/lib/api";
import { getSite, saveConfig } from "@/lib/data";
import type { Config } from "@/lib/types";

/** Guarda los textos de la web y las reglas de reserva. Solo cambia los campos que llegan. */
export async function PUT(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const { config: cur } = await getSite();
    const has = (k: keyof Config) => b[k] !== undefined;
    const text = (k: keyof Config, max: number) => (has(k) ? str(b[k], max) : (cur[k] as string));
    const next: Config = {
      ...cur,
      name: text("name", 60) || cur.name,
      slogan: text("slogan", 100),
      description: text("description", 400),
      address: text("address", 120),
      mapsUrl: text("mapsUrl", 400),
      whatsapp: has("whatsapp") ? cleanPhone(b.whatsapp) : cur.whatsapp,
      instagram: text("instagram", 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""),
      hours: text("hours", 120),
      notice: text("notice", 200),
      bookingNote: text("bookingNote", 300),
      services: Array.isArray(b.services)
        ? (b.services as Record<string, unknown>[]).slice(0, 12).map((s) => ({ title: str(s.title, 60), text: str(s.text, 200) })).filter((s) => s.title)
        : cur.services,
      nightFrom: has("nightFrom") ? int(b.nightFrom, 0, 1440, cur.nightFrom) : cur.nightFrom,
      daysAhead: has("daysAhead") ? int(b.daysAhead, 1, 60, cur.daysAhead) : cur.daysAhead,
      cancelHours: has("cancelHours") ? int(b.cancelHours, 0, 72, cur.cancelHours) : cur.cancelHours,
      open: has("open") ? !!b.open : cur.open,
    };
    await saveConfig(next);
    return ok({ config: next });
  } catch (e) {
    return handle(e);
  }
}
