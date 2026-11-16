"use client";
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/util";

type State = "loading" | "unsupported" | "ios" | "denied" | "off" | "on";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Activa en este celular los avisos de reservas nuevas y cancelaciones */
export default function Notif({ vapidKey, say }: { vapidKey: string; say: (m: string) => void }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!ok) {
        // En iPhone las notificaciones solo existen cuando la web está agregada a la pantalla de inicio
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        return setState(ios ? "ios" : "unsupported");
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (Notification.permission === "denied") return setState("denied");
        setState((await reg.pushManager.getSubscription()) ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
      await api("/api/panel/push", "POST", { sub: sub.toJSON() });
      setState("on");
      await api("/api/panel/push", "POST", { test: sub.endpoint }).catch(() => {});
      say("Avisos activados en este celular ✓");
    } catch (e) {
      say(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/panel/push", "DELETE", { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      say("Avisos desactivados en este celular");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (!sub) return setState("off");
      // por si el servidor perdió este celular, se vuelve a anotar antes de probar
      await api("/api/panel/push", "POST", { sub: sub.toJSON() });
      await api("/api/panel/push", "POST", { test: sub.endpoint });
      say("Te mandamos un aviso de prueba");
    } catch (e) {
      say(errMsg(e));
    }
  }

  if (!vapidKey || state === "loading" || state === "unsupported") return null;
  if (state === "on")
    return (
      <div className="notif on">
        <span>🔔 Avisos activados en este celular</span>
        <span className="row" style={{ gap: 6 }}>
          <button type="button" className="btn sm ghost" onClick={test}>Probar</button>
          <button type="button" className="btn sm ghost" disabled={busy} onClick={disable}>Desactivar</button>
        </span>
      </div>
    );
  return (
    <div className="notif">
      {state === "ios" ? (
        <span>🔔 Para recibir avisos en iPhone: tocá <b>Compartir</b> y después <b>Agregar a inicio</b>. Abrí el panel desde ese ícono y activá los avisos.</span>
      ) : state === "denied" ? (
        <span>🔕 Los avisos están bloqueados en este celular. Habilitá las notificaciones de este sitio desde la configuración del navegador.</span>
      ) : (
        <>
          <span>🔔 Recibí un aviso cada vez que entra o se cancela una reserva.</span>
          <button type="button" className="btn sm" disabled={busy} onClick={enable}>{busy ? "Activando…" : "Activar avisos"}</button>
        </>
      )}
    </div>
  );
}
