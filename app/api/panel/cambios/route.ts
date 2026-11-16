import { fail, handle, ok } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { getLive } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Consulta liviana que hace el panel cada tanto para saber si hay turnos nuevos. Sale de la caché: no gasta comandos. */
export async function GET() {
  try {
    if (!(await getRole())) return fail("Tenés que iniciar sesión.", 401);
    return ok(await getLive());
  } catch (e) {
    return handle(e);
  }
}
