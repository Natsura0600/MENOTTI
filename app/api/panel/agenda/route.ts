import { denied, fail, handle, ok } from "@/lib/api";
import { dayBookings, getLive, getSite } from "@/lib/data";
import { isValidDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const date = new URL(req.url).searchParams.get("date") ?? "";
    if (!isValidDate(date)) return fail("Fecha inválida.");
    const [{ config, courts }, live] = await Promise.all([getSite(), getLive()]);
    const bookings = await dayBookings(date, courts, config.nightFrom);
    return ok({ date, v: live.v, courts, bookings });
  } catch (e) {
    return handle(e);
  }
}
