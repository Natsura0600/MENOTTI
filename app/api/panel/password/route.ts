import bcrypt from "bcryptjs";
import { denied, fail, handle, ok } from "@/lib/api";
import { createSession, getAuth, type Auth } from "@/lib/auth";
import { kv } from "@/lib/kv";

export async function POST(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const auth = await getAuth();
    if (!auth || !(await bcrypt.compare(String(b.current ?? ""), auth.hash))) return fail("La contraseña actual no es correcta.");
    const next = String(b.next ?? "");
    if (next.length < 6) return fail("La contraseña nueva tiene que tener al menos 6 caracteres.");
    const updated: Auth = { hash: await bcrypt.hash(next, 10), sv: auth.sv + 1 };
    await kv.set("auth", updated);
    await createSession(updated.sv); // este dispositivo sigue adentro; los demás quedan afuera
    return ok();
  } catch (e) {
    return handle(e);
  }
}
