"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type W = Window & { __m10Install?: PromptEvent | null };

/**
 * Botón para instalar el panel como app en Android (Samsung, Motorola, etc.) con Chrome o Samsung Internet.
 * Instalada abre directo la agenda, con ícono propio y a pantalla completa. En iPhone se instala desde Compartir
 * (eso lo explica el aviso de notificaciones).
 */
export default function InstallApp() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "button" | "help">("hidden");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return; // ya está instalada y abierta como app
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("m10_install_hide") === "1";
    } catch {}
    const android = /android/i.test(navigator.userAgent);
    // el navegador puede ofrecer la instalación antes de que cargue esta parte: lo atrapa un script en la página
    const early = (window as W).__m10Install;
    if (early) {
      setPrompt(early);
      setMode("button");
    } else if (android && !dismissed) setMode("help");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
      setMode("button");
    };
    const onInstalled = () => {
      setPrompt(null);
      setMode("hidden");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    (window as W).__m10Install = null;
    setPrompt(null);
    setMode(outcome === "accepted" ? "hidden" : "help");
  }

  if (mode === "hidden") return null;
  if (mode === "button")
    return (
      <div className="notif">
        <span>📲 Instalá el panel como app: ícono en el celular y abre directo en la agenda.</span>
        <button type="button" className="btn sm" onClick={install}>Instalar app</button>
      </div>
    );
  return (
    <div className="notif">
      <span>📲 Podés instalar el panel como app en este celular.</span>
      <span className="row" style={{ gap: 6 }}>
        <button type="button" className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? "Cerrar" : "¿Cómo?"}</button>
        <button
          type="button"
          className="btn sm ghost"
          aria-label="No mostrar más"
          onClick={() => {
            try {
              localStorage.setItem("m10_install_hide", "1");
            } catch {}
            setMode("hidden");
          }}
        >
          ✕
        </button>
      </span>
      {open && (
        <ol className="install-help">
          <li><b>Chrome:</b> tocá el menú <b>⋮</b> (arriba a la derecha) → <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li>
          <li><b>Samsung Internet:</b> tocá el menú <b>≡</b> (abajo a la derecha) → <b>Agregar página a</b> → <b>Pantalla de inicio</b>.</li>
          <li>Abrí el panel desde el ícono nuevo y, si todavía no lo hiciste, tocá <b>Activar avisos</b>.</li>
        </ol>
      )}
    </div>
  );
}
