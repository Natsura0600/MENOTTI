"use client";
import { useState } from "react";
import { api, errMsg } from "@/lib/util";

type Next = { date: string; label: string; canSkip: boolean };

/** Lo que el cliente puede hacer con su turno fijo: avisar que una semana no viene, o darlo de baja */
export default function FijoActions({ id, token, next, cancelHours, wa }: { id: string; token: string; next: Next[]; cancelHours: number; wa: string }) {
  const [busy, setBusy] = useState(false);

  async function run(body: Record<string, unknown>, ask: string, done: string, goHome = false) {
    if (!confirm(ask)) return;
    setBusy(true);
    try {
      await api(`/api/reservas/${id}`, "DELETE", { token, ...body });
      if (goHome) {
        try {
          const mine = JSON.parse(localStorage.getItem("m10_mine") ?? "[]") as { id: string }[];
          localStorage.setItem("m10_mine", JSON.stringify(mine.filter((m) => m.id !== id)));
        } catch {}
      }
      alert(done);
      if (goHome) location.href = "/";
      else location.reload();
    } catch (e) {
      alert(errMsg(e));
      setBusy(false);
    }
  }

  const first = next[0];
  return (
    <div className="stack">
      {first &&
        (first.canSkip ? (
          <button className="btn ghost full" disabled={busy} onClick={() => run({ scope: "semana", date: first.date }, `¿Avisamos que no venís el ${first.label}? Ese día queda libre para otro equipo. Las demás semanas siguen igual.`, `Listo: el ${first.label} quedó libre. Las demás semanas seguís teniendo tu turno.`)}>
            No voy el {first.label}
          </button>
        ) : (
          <p className="mut small center">
            Faltan menos de {cancelHours} hs para el {first.label}: si no podés venir,{" "}
            {wa ? <a href={wa} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>avisanos por WhatsApp</a> : "avisanos"}.
          </p>
        ))}
      <button className="btn danger full" disabled={busy} onClick={() => run({ scope: "siempre" }, "¿Dar de baja tu turno fijo? Dejás de tener ese horario todas las semanas.", "Tu turno fijo quedó dado de baja.", true)}>
        Dar de baja el turno fijo
      </button>
    </div>
  );
}
