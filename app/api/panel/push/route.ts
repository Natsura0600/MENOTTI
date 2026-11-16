import { denied, fail, handle, ok } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { notifyOne, pushReady, subscribe, unsubscribe, validSub } from "@/lib/push";

/** Activa los avisos en este celular ({ sub }) o manda uno de prueba ({ test: endpoint }) */
export async function POST(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    if (!pushReady) return fail("Las notificaciones todavía no están configuradas en el servidor.", 503);
    const b = await req.json().catch(() => ({}));
    if (typeof b.test === "string") {
      const sent = await notifyOne(b.test, { title: "Notificaciones activadas ✓", body: "Así te va a avisar cuando entre una reserva.", url: "/panel", tag: "prueba" });
      return sent ? ok() : fail("No se pudo enviar. Volvé a activar las notificaciones.");
    }
    if (!validSub(b.sub)) return fail("Suscripción inválida.");
    await subscribe(b.sub, (await getRole()) ?? "staff");
    return ok();
  } catch (e) {
    return handle(e);
  }
}

/** Desactiva los avisos en este celular */
export async function DELETE(req: Request) {
  try {
    const no = await denied("staff");
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    if (typeof b.endpoint === "string") await unsubscribe(b.endpoint);
    return ok();
  } catch (e) {
    return handle(e);
  }
}
