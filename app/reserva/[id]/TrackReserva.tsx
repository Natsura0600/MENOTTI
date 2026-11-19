"use client";
import { track } from "@vercel/analytics";
import { useEffect } from "react";

type VaWindow = Window & { va?: (...params: unknown[]) => void; vaq?: unknown[][] };

/** Cuenta una reserva nueva en las estadísticas (una sola vez, aunque recarguen el comprobante) */
export default function TrackReserva({ id, cancha, tipo }: { id: string; cancha: string; tipo: number }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("m10_tracked_" + id)) return;
    } catch {}
    // El componente de estadísticas arranca después que esta página. Se deja lista la misma cola que usa
    // la librería (si ya existe no se toca): el evento espera ahí y sale cuando cargue el script.
    const w = window as VaWindow;
    if (!w.va) w.va = (...params: unknown[]) => (w.vaq ??= []).push(params);
    track("Reserva confirmada", { cancha, tipo });
    try {
      sessionStorage.setItem("m10_tracked_" + id, "1");
    } catch {}
  }, [id, cancha, tipo]);
  return null;
}
