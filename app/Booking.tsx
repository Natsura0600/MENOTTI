"use client";
import { useEffect, useRef, useState } from "react";
import { addDays, cap, dayNum, dayOfWeek, DOW_NAMES, fmtDow, fmtLong, hm } from "@/lib/time";
import { api, errMsg, money } from "@/lib/util";

type CourtInfo = { id: string; name: string; tipo: number; detail: string; from: number };
type Slot = { start: number; dur: number; price: number; free: boolean };
/** Lo que el celular recuerda de cada reserva. Los turnos fijos guardan día de la semana y desde cuándo. */
type Mine = { id: string; token: string; label: string; date?: string; start?: number; courtId?: string; dow?: number; since?: string };

export default function Booking({ courts, today, daysAhead, open, fijosWeb, wa }: { courts: CourtInfo[]; today: string; daysAhead: number; open: boolean; fijosWeb: boolean; wa: string }) {
  const [courtId, setCourtId] = useState<string | null>(courts.length === 1 ? courts[0].id : null);
  const court = courts.find((c) => c.id === courtId) ?? null;
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [repeat, setRepeat] = useState(false); // true = turno fijo, todas las semanas
  const [mine, setMine] = useState<Mine[]>([]);
  const hoursRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Recordar nombre, teléfono y reservas hechas desde este celular
  useEffect(() => {
    try {
      setName(localStorage.getItem("m10_name") ?? "");
      setPhone(localStorage.getItem("m10_phone") ?? "");
    } catch {}
    // "Tu reserva" solo se muestra si sigue en pie: si la canceló el jugador o el complejo, o ya pasó, se borra sola
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

  useEffect(() => {
    if (!courtId) return;
    setSlots(null);
    setSlot(null);
    let alive = true;
    api<{ slots: Slot[] }>(`/api/disponibilidad?date=${date}&court=${courtId}`)
      .then((r) => alive && setSlots(r.slots))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [courtId, date]);

  const go = (el: HTMLElement | null) => setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  async function reservar() {
    if (!slot || !court) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api<{ id: string; token: string }>("/api/reservas", "POST", { courtId: court.id, date, start: slot.start, name, phone, repeat });
      try {
        localStorage.setItem("m10_name", name);
        localStorage.setItem("m10_phone", phone);
        const dow = dayOfWeek(date);
        const item: Mine = repeat
          ? { id: r.id, token: r.token, label: `Turno fijo · ${court.name} · todos los ${DOW_NAMES[dow]} ${hm(slot.start)}`, start: slot.start, courtId: court.id, dow, since: date }
          : { id: r.id, token: r.token, label: `${court.name} · ${cap(fmtLong(date))} · ${hm(slot.start)}`, date, start: slot.start, courtId: court.id };
        localStorage.setItem("m10_mine", JSON.stringify([item, ...mine].slice(0, 5)));
      } catch {}
      location.href = `/reserva/${r.id}?t=${r.token}&nuevo=1`;
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
      // si se ocupó, refrescamos los horarios
      api<{ slots: Slot[] }>(`/api/disponibilidad?date=${date}&court=${courtId}`).then((r) => setSlots(r.slots)).catch(() => {});
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
  // Un horario es "tuyo" si lo reservaste para ese día, o si es tu turno fijo de ese día de la semana
  const isOwn = (start: number) =>
    mine.some((m) => m.start === start && m.courtId === courtId && (m.dow !== undefined ? m.dow === dayOfWeek(date) && date >= (m.since ?? "") : m.date === date));
  // (si el horario figura libre, es porque esa semana lo liberaste: ya no es tuyo)
  const ownCount = slots?.filter((s) => !s.free && isOwn(s.start)).length ?? 0;

  return (
    <div>
      {mine.map((m) => (
        <a className="mine" key={m.id} href={`/reserva/${m.id}?t=${m.token}`}>
          <span>📋 Tu reserva: {m.label}</span>
          <span>Ver ›</span>
        </a>
      ))}

      <div className="step">
        <h3><span className="num">1</span> ¿Qué cancha querés?</h3>
        <div className="opts">
          {courts.map((t) => (
            <button key={t.id} className={"opt" + (courtId === t.id ? " on" : "")} onClick={() => { setCourtId(t.id); go(hoursRef.current); }}>
              <b>{t.name}</b>
              <small>
                Fútbol {t.tipo}
                {t.detail && ` · ${t.detail}`}
                {t.from > 0 && ` · desde ${money(t.from)}`}
              </small>
            </button>
          ))}
        </div>
      </div>

      {court && (
        <div className="step" ref={hoursRef}>
          <h3><span className="num">2</span> ¿Qué día y a qué hora?</h3>
          <div className="days">
            {days.map((d, i) => (
              <button key={d} className={"day" + (d === date ? " on" : "")} onClick={() => setDate(d)}>
                <b>{i === 0 ? "Hoy" : i === 1 ? "Mañana" : fmtDow(d)}</b>
                <small>{dayNum(d)}</small>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            {slots === null ? (
              <p className="mut center" style={{ padding: 20 }}>Buscando horarios…</p>
            ) : freeCount === 0 && ownCount === 0 ? (
              <div className="card center">
                <p><b>No quedan turnos libres este día.</b></p>
                <p className="mut small">Probá con otro día.</p>
              </div>
            ) : (
              <div className="hours">
                {slots.map((s) => {
                  // El horario que ya reservaste desde este celular se ve como tuyo, no como libre
                  const own = !s.free && isOwn(s.start);
                  return (
                    <button key={s.start} disabled={!s.free || own} className={"hour" + (own ? " own" : slot?.start === s.start ? " on" : "")} onClick={() => { setSlot(s); setErr(""); go(formRef.current); }}>
                      <b>{hm(s.start)}</b>
                      <small>{own ? "Tu turno" : s.free ? (s.price ? money(s.price) : "Libre") : "Ocupado"}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {court && slot && (
        <div className="step" ref={formRef}>
          <h3><span className="num">3</span> Tus datos</h3>
          {fijosWeb && (
            <div className="field">
              <label>¿Cada cuánto?</label>
              <div className="freq">
                <button type="button" className={repeat ? "" : "on"} aria-pressed={!repeat} onClick={() => setRepeat(false)}>
                  <b>Solo esta vez</b>
                  <small>{cap(fmtLong(date))}</small>
                </button>
                <button type="button" className={repeat ? "on" : ""} aria-pressed={repeat} onClick={() => setRepeat(true)}>
                  <b>Todas las semanas</b>
                  <small>Turno fijo: todos los {DOW_NAMES[dayOfWeek(date)]}</small>
                </button>
              </div>
            </div>
          )}
          <div className="sum">
            ⚽ {court.name} · Fútbol {court.tipo} · {hm(slot.start)} hs
            {repeat ? (
              <small>
                Todos los {DOW_NAMES[dayOfWeek(date)]}, desde el {fmtLong(date).replace(/^[^,]+, /, "")}
                {slot.price ? ` · ${money(slot.price)} por turno` : ""}
              </small>
            ) : (
              <small>{cap(fmtLong(date))}{slot.price ? ` · ${money(slot.price)}` : ""}</small>
            )}
          </div>
          {repeat && (
            <p className="hint" style={{ margin: "-4px 0 14px" }}>
              Cada turno se paga en el complejo. Si una semana no podés venir, lo avisás desde tu reserva y ese día queda libre.
            </p>
          )}
          {err && <div className="err">{err}</div>}
          <div className="field">
            <label htmlFor="n">Nombre y apellido</label>
            <input id="n" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
          </div>
          <div className="field">
            <label htmlFor="p">Tu WhatsApp</label>
            <input id="p" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 11 5555 0000" />
          </div>
          <p className="legal-note">
            Al reservar aceptás los <a href="/terminos" target="_blank" rel="noopener">Términos</a> y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a>.
          </p>
          <button className="btn big" disabled={busy || name.trim().length < 3 || phone.replace(/\D/g, "").length < 10} onClick={reservar}>
            {busy ? "Reservando…" : repeat ? "✅ Confirmar turno fijo" : "✅ Confirmar reserva"}
          </button>
        </div>
      )}
    </div>
  );
}
