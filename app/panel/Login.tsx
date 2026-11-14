"use client";
import { useState } from "react";
import { api, errMsg } from "@/lib/util";

export default function Login({ first }: { first: boolean }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (first && pass !== pass2) return setErr("Las contraseñas no coinciden.");
    setBusy(true);
    setErr("");
    try {
      await api("/api/auth/login", "POST", { password: pass });
      location.reload();
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }
  return (
    <main className="wrap" style={{ maxWidth: 420, padding: "50px 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="M10" style={{ width: 110, height: 110, borderRadius: 22, display: "block", margin: "0 auto 18px" }} />
      <h1 className="title center" style={{ fontSize: 28, marginBottom: 6 }}>Panel de administración</h1>
      <p className="mut center" style={{ marginBottom: 22 }}>{first ? "Primera vez: elegí la contraseña del panel." : "Ingresá la contraseña."}</p>
      <form onSubmit={go}>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>{first ? "Contraseña nueva (mínimo 6)" : "Contraseña"}</label>
          <input type="password" autoFocus value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        {first && (
          <div className="field">
            <label>Repetila</label>
            <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          </div>
        )}
        <button className="btn big" disabled={busy || pass.length < (first ? 6 : 1)}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
