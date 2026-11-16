import bcrypt from "bcryptjs";
import { denied, fail, handle, ok } from "@/lib/api";
import { getAuthFresh } from "@/lib/auth";
import { bustAll } from "@/lib/cache";
import { wipe } from "@/lib/data";

/**
 * Solo el dueño.
 * - { action: "recargar" }: descarta la caché y vuelve a leer todo de la base.
 * - { action: "turnos" | "todo", password }: vacía datos. Pide la contraseña del dueño porque no se puede deshacer.
 */
export async function POST(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    if (b.action === "recargar") {
      bustAll();
      return ok();
    }
    if (b.action !== "turnos" && b.action !== "todo") return fail("Acción inválida.");
    const auth = await getAuthFresh();
    // Si la base se vació por fuera ya no hay contraseña guardada: alcanza con la sesión del dueño
    if (auth && !(await bcrypt.compare(String(b.password ?? ""), auth.hash))) return fail("La contraseña no es correcta.");
    const deleted = await wipe(b.action);
    return ok({ deleted });
  } catch (e) {
    return handle(e);
  }
}
