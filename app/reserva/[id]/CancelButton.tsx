"use client";
import { useState } from "react";
import { api, errMsg } from "@/lib/util";

export default function CancelButton({ id, token }: { id: string; token: string }) {
  const [busy, setBusy] = useState(false);
  async function cancel() {
    if (!confirm("¿Seguro que querés cancelar el turno?")) return;
    setBusy(true);
    try {
      await api(`/api/reservas/${id}`, "DELETE", { token });
      try {
        const mine = JSON.parse(localStorage.getItem("m10_mine") ?? "[]") as { id: string }[];
        localStorage.setItem("m10_mine", JSON.stringify(mine.filter((m) => m.id !== id)));
      } catch {}
      alert("Turno cancelado.");
      location.href = "/";
    } catch (e) {
      alert(errMsg(e));
      setBusy(false);
    }
  }
  return <button className="btn danger full" disabled={busy} onClick={cancel}>{busy ? "Cancelando…" : "Cancelar turno"}</button>;
}
