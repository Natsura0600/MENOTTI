"use client";
import { useEffect, useRef, useState } from "react";
import { addDays, dayNum, fmtDow, fmtLong, hm, cap } from "@/lib/time";
import { api, errMsg, money } from "@/lib/util";

type TipoInfo = { tipo: number; count: number; from: number };
type Slot = { start: number; dur: number; price: number; free: boolean };
type Mine = { id: string; token: string; label: string };

export default function Booking({ tipos, today, daysAhead, open, wa }: { tipos: TipoInfo[]; today: string; daysAhead: number; open: boolean; wa: string }) {
  const [tipo, setTipo] = useState<number | null>(tipos.length === 1 ? tipos[0].tipo : null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Mine[]>([]);
  const hoursRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Recordar nombre, teléfono y reservas hechas desde este celular
  useEffect(() => {
    try {
      setName(localStorage.getItem("m10_name") ?? "");
      setPhone(localStorage.getItem("m10_phone") ?? "");
    } catch {}
    // "Tu reserva" solo se muestra si sigue en pie: si la canceló el jugador o el complejo, o ya pasó, se borra
    let alive = true;
    const check = async () => {
      let saved: Mine[] = [];
      try {
        saved = JSON.parse(localStorage.getItem("m10_mine") ?? "[]");
      } catch {}
      if (!Array.isArray(saved) || saved.length === 0) return alive && setMine([]);
      try {
        const { ids } = await api<{ ids: string[] }>("/api/reservas/vigentes", "POST", { items: saved.map(({ id, token }) => ({ id, token })) });
        const ok = saved.filter((m) => ids.includes(m.id));
        if (ok.length !== saved.length) localStorage.setItem("m10_mine", JSON.stringify(ok));
        if (alive) setMine(ok);
      } catch {
        // sin conexión: no se muestra nada dudoso y se reintenta al volver a la pestaña
      }
    };
    check();
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  // Las tarjetas de "Nuestras canchas" pueden dejar elegido un tamaño
  useEffect(() => {
    const on = (e: Event) => {
      const t = Number((e as CustomEvent).detail);
      if (tipos.some((x) => x.tipo === t)) setTipo(t);
    };
    window.addEventListener("m10:tipo", on);
    return () => window.removeEventListener("m10:tipo", on);
  }, [tipos]);

  useEffect(() => {
    if (!tipo) return;
    setSlots(null);
    setSlot(null);
    let alive = true;
    api<{ slots: Slot[] }>(`/api/disponibilidad?date=${date}&tipo=${tipo}`)
      .then((r) => alive && setSlots(r.slots))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [tipo, date]);

  const go = (el: HTMLElement | null) => setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  async function reservar() {
    if (!slot || !tipo) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api<{ id: string; token: string }>("/api/reservas", "POST", { tipo, date, start: slot.start, name, phone });
      try {
        localStorage.setItem("m10_name", name);
        localStorage.setItem("m10_phone", phone);
        const label = `F${tipo} · ${cap(fmtLong(date))} · ${hm(slot.start)}`;
        localStorage.setItem("m10_mine", JSON.stringify([{ id: r.id, token: r.token, label }, ...mine].slice(0, 5)));
      } catch {}
      location.href = `/reserva/${r.id}?t=${r.token}&nuevo=1`;
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
      // si se ocupó, refrescamos los horarios
      api<{ slots: Slot[] }>(`/api/disponibilidad?date=${date}&tipo=${tipo}`).then((r) => setSlots(r.slots)).catch(() => {});
    }
  }

  if (!open)
    return (
      <div className="card center stack">
        <p><b>Las reservas online están pausadas.</b></p>
        {wa && <a className="btn full" href={wa} target="_blank" rel="noopener">Reservá por WhatsApp</a>}
      </div>
    );

  const days = Array.from({ length: daysAhead + 1 }, (_, i) => addDays(today, i));
  const freeCount = slots?.filter((s) => s.free).length ?? 0;

  return (
    <div>
      {mine.length > 0 && (
        <a className="mine" href={`/reserva/${mine[0].id}?t=${mine[0].token}`}>
          <span>Tu reserva: {mine[0].label}</span>
          <span>Ver ›</span>
        </a>
      )}

      <div className="step">
        <h3><span className={"num" + (tipo ? " done" : "")}>1</span> ¿De cuánto es la cancha?</h3>
        <div className="opts">
          {tipos.map((t) => (
            <button key={t.tipo} type="button" aria-pressed={tipo === t.tipo} className={"opt" + (tipo === t.tipo ? " on" : "")} onClick={() => { setTipo(t.tipo); go(hoursRef.current); }}>
              <b>Fútbol {t.tipo}</b>
              {t.from > 0 && <small>desde {money(t.from)}</small>}
            </button>
          ))}
        </div>
      </div>

      {tipo && (
        <div className="step" ref={hoursRef}>
          <h3><span className={"num" + (slot ? " done" : "")}>2</span> ¿Qué día y a qué hora?</h3>
          <div className="days">
            {days.map((d, i) => (
              <button key={d} type="button" aria-pressed={d === date} className={"day" + (d === date ? " on" : "")} onClick={() => setDate(d)}>
                <b>{i === 0 ? "Hoy" : i === 1 ? "Mañana" : fmtDow(d)}</b>
                <small>{dayNum(d)}</small>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }} aria-live="polite" aria-busy={slots === null}>
            {slots === null ? (
              <div className="hours" role="status" aria-label="Buscando horarios">
                {Array.from({ length: 8 }, (_, i) => <span key={i} className="hour skel" />)}
              </div>
            ) : freeCount === 0 ? (
              <div className="card center">
                <p><b>No quedan turnos libres este día.</b></p>
                <p className="mut small">Probá con otro día.</p>
              </div>
            ) : (
              <div className="hours">
                {slots.map((s) => (
                  <button key={s.start} type="button" disabled={!s.free} aria-pressed={slot?.start === s.start} className={"hour" + (slot?.start === s.start ? " on" : "")} onClick={() => { setSlot(s); setErr(""); go(formRef.current); }}>
                    <b>{hm(s.start)}</b>
                    <small>{s.free ? (s.price ? money(s.price) : "Libre") : "Ocupado"}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tipo && slot && (
        <div className="step" ref={formRef}>
          <h3><span className="num">3</span> Tus datos</h3>
          <div className="sum">
            Fútbol {tipo} · {hm(slot.start)} hs
            <small>{cap(fmtLong(date))}{slot.price ? ` · ${money(slot.price)}` : ""}</small>
          </div>
          {err && <div className="err" role="alert">{err}</div>}
          <div className="field">
            <label htmlFor="n">Nombre y apellido</label>
            <input id="n" type="text" autoComplete="name" maxLength={60} enterKeyHint="next" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
          </div>
          <div className="field">
            <label htmlFor="p">Tu WhatsApp</label>
            <input id="p" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} enterKeyHint="done" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 11 5555 0000" />
          </div>
          <button type="button" className="btn big full" disabled={busy || name.trim().length < 3 || phone.replace(/\D/g, "").length < 10} onClick={reservar}>
            {busy ? "Reservando…" : "Confirmar reserva"}
          </button>
        </div>
      )}
    </div>
  );
}
