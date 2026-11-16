import bcrypt from "bcryptjs";
import { denied, fail, handle, ok } from "@/lib/api";
import { createSession, getAuthFresh, saveAuth, type Auth } from "@/lib/auth";

/**
 * Solo el dueño.
 * - { current, next }: cambia la contraseña del dueño.
 * - { staff: "clave" }: crea o cambia la contraseña del empleado. { staff: "" } quita ese usuario.
 */
export async function POST(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const auth = await getAuthFresh();
    if (!auth) return fail("El panel todavía no tiene contraseña.");

    if (b.staff !== undefined) {
      const staff = String(b.staff ?? "");
      const sv = (auth.staff?.sv ?? 0) + 1; // al cambiarla o quitarla, el empleado queda afuera en todos sus celulares
      if (!staff) {
        await saveAuth({ hash: auth.hash, sv: auth.sv });
        return ok({ staff: false });
      }
      if (staff.length < 6) return fail("La contraseña del empleado tiene que tener al menos 6 caracteres.");
      if (await bcrypt.compare(staff, auth.hash)) return fail("La contraseña del empleado tiene que ser distinta a la tuya.");
      await saveAuth({ ...auth, staff: { hash: await bcrypt.hash(staff, 10), sv } });
      return ok({ staff: true });
    }

    if (!(await bcrypt.compare(String(b.current ?? ""), auth.hash))) return fail("La contraseña actual no es correcta.");
    const next = String(b.next ?? "");
    if (next.length < 6) return fail("La contraseña nueva tiene que tener al menos 6 caracteres.");
    if (auth.staff && (await bcrypt.compare(next, auth.staff.hash))) return fail("Esa es la contraseña del empleado. Elegí otra.");
    const updated: Auth = { ...auth, hash: await bcrypt.hash(next, 10), sv: auth.sv + 1 };
    await saveAuth(updated);
    await createSession(updated.sv, "admin"); // este dispositivo sigue adentro; los demás quedan afuera
    return ok();
  } catch (e) {
    return handle(e);
  }
}
