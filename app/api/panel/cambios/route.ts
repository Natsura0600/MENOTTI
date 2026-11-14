import { fail, handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getLive } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Consulta liviana (1 comando) que hace el panel cada tanto para saber si hay turnos nuevos */
export async function GET() {
  try {
    if (!(await getSession())) return fail("Tenés que iniciar sesión.", 401);
    return ok(await getLive());
  } catch (e) {
    return handle(e);
  }
}
