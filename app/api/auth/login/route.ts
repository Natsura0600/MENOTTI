import bcrypt from "bcryptjs";
import { fail, handle, ok } from "@/lib/api";
import { createSession, getAuth, type Auth } from "@/lib/auth";
import { kv } from "@/lib/kv";

/** Entra al panel. La primera vez (todavía no hay contraseña) la crea. */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const password = String(b.password ?? "");
    const auth = await getAuth();
    if (!auth) {
      if (password.length < 6) return fail("La contraseña tiene que tener al menos 6 caracteres.");
      const created: Auth = { hash: await bcrypt.hash(password, 10), sv: 1 };
      if (!(await kv.set("auth", created, { nx: true }))) return fail("El panel ya tiene contraseña. Recargá la página.");
      await createSession(created.sv);
      return ok();
    }
    const fails = Number((await kv.get<number>("loginfails")) ?? 0);
    if (fails >= 8) return fail("Demasiados intentos. Esperá 10 minutos y probá de nuevo.", 429);
    if (!(await bcrypt.compare(password, auth.hash))) {
      await kv.set("loginfails", fails + 1, { ex: 600 });
      return fail("Contraseña incorrecta.", 401);
    }
    if (fails) await kv.del("loginfails");
    await createSession(auth.sv);
    return ok();
  } catch (e) {
    return handle(e);
  }
}
