"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, cap, fmtLong, hm, parseHM, DOW_NAMES, dayOfWeek } from "@/lib/time";
import { TIPOS, type Booking, type Config, type Court, type Service } from "@/lib/types";
import { api, errMsg, money, waLink } from "@/lib/util";

type Tab = "turnos" | "canchas" | "web" | "ajustes";

export default function Panel({ initialConfig, initialCourts, today }: { initialConfig: Config; initialCourts: Court[]; today: string }) {
  const [tab, setTab] = useState<Tab>("turnos");
  const [config, setConfig] = useState(initialConfig);
  const [courts, setCourts] = useState(initialCourts);
  const [toast, setToast] = useState("");
  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  }, []);

  return (
    <>
      <header className="top">
        <div className="wrap wide">
          <a href="/" className="brand" target="_blank">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="M10" />
            <span>Panel</span>
          </a>
          <button className="btn sm ghost" onClick={async () => { await api("/api/auth/logout", "POST"); location.reload(); }}>Salir</button>
        </div>
      </header>
      <nav className="tabs">
        {(["turnos", "canchas", "web", "ajustes"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "web" ? "Mi web" : t}</button>
        ))}
      </nav>
      <main className="wrap wide" style={{ paddingBottom: 40 }}>
        {tab === "turnos" && <Agenda today={today} say={say} />}
        {tab === "canchas" && <Canchas courts={courts} onSaved={(c) => { setCourts(c); say("Canchas guardadas ✓"); }} />}
        {tab === "web" && <Web config={config} onSaved={(c) => { setConfig(c); say("Cambios guardados ✓"); }} />}
        {tab === "ajustes" && <Ajustes config={config} onSaved={(c) => { setConfig(c); say("Cambios guardados ✓"); }} say={say} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// ======================= TURNOS =======================
type Sel = { court: Court; start: number; booking?: Booking };

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((d) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + d);
      o.stop(ctx.currentTime + d + 0.16);
    });
  } catch {}
}

function slotsOf(c: Court) {
  const out: number[] = [];
  for (let t = c.open; t + c.dur <= c.close; t += c.dur) out.push(t);
  return out;
}

function Agenda({ today, say }: { today: string; say: (m: string) => void }) {
  const [date, setDate] = useState(today);
  const [data, setData] = useState<{ courts: Court[]; bookings: Booking[] } | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const ver = useRef<string | null>(null);
  const lastAt = useRef<number>(Date.now());

  const load = useCallback(async () => {
    try {
      const r = await api<{ courts: Court[]; bookings: Booking[]; v: string }>(`/api/panel/agenda?date=${date}`);
      ver.current = r.v;
      setData({ courts: r.courts, bookings: r.bookings });
    } catch (e) {
      if (errMsg(e).includes("sesión")) location.reload();
    }
  }, [date]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  // Cada 15 segundos pregunta si hubo cambios; si entra una reserva online, suena y avisa
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await api<{ v: string; last: { name: string; date: string; start: number; at: number } | null }>("/api/panel/cambios");
        if (r.last && r.last.at > lastAt.current) {
          lastAt.current = r.last.at;
          beep();
          say(`🔔 Nueva reserva: ${r.last.name} · ${r.last.date === today ? "hoy" : r.last.date.split("-").reverse().slice(0, 2).join("/")} ${hm(r.last.start)}`);
        }
        if (ver.current && r.v !== ver.current) load();
      } catch {}
    }, 15000);
    return () => clearInterval(id);
  }, [load, say, today]);

  const courts = data?.courts.filter((c) => c.active) ?? [];
  const bookings = data?.bookings ?? [];
  const real = bookings.filter((b) => b.origin !== "bloqueo");
  const total = real.reduce((s, b) => s + b.price, 0);

  function sharedBusy(c: Court, t: number) {
    const ids = new Set(c.shares);
    for (const o of data?.courts ?? []) if (o.shares.includes(c.id)) ids.add(o.id);
    return bookings.find((b) => ids.has(b.courtId) && b.start < t + c.dur && t < b.start + b.dur);
  }

  return (
    <>
      <div className="datebar">
        <button className="btn dark sq" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
        <div className="mid">
          {date === today ? "Hoy" : date === addDays(today, 1) ? "Mañana" : ""} <span className={date === today || date === addDays(today, 1) ? "mut small" : ""}>{cap(fmtLong(date))}</span>
        </div>
        <button className="btn dark sq" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">›</button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        {date !== today && <button className="btn sm ghost" onClick={() => setDate(today)}>Volver a hoy</button>}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ maxWidth: 190, minHeight: 40, padding: "6px 10px" }} />
      </div>
      <div className="stats">
        <span className="chip">⚽ {real.length} turnos</span>
        {total > 0 && <span className="chip">💰 {money(total)}</span>}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--g)" }} />Reservado</span>
        <span><i style={{ background: "var(--amber)" }} />Turno fijo</span>
        <span><i style={{ background: "#555" }} />Bloqueado</span>
        <span><i style={{ border: "2px dashed #555" }} />Libre (tocá para cargar)</span>
      </div>
      {!data ? (
        <p className="mut center" style={{ padding: 30 }}>Cargando…</p>
      ) : (
        courts.map((c) => (
          <div className="court" key={c.id}>
            <h3>{c.name} <span className="mut small">Fútbol {c.tipo}</span></h3>
            <div className="slots">
              {slotsOf(c).map((t) => {
                const b = bookings.find((x) => x.courtId === c.id && x.start < t + c.dur && t < x.start + x.dur);
                const sh = !b ? sharedBusy(c, t) : undefined;
                const cls = b ? b.origin : sh ? "shared" : "";
                return (
                  <button key={t} className={"slot " + cls} disabled={!!sh} onClick={() => setSel({ court: c, start: t, booking: b })}>
                    <b>{hm(t)}</b>
                    <span>{b ? (b.origin === "web" ? "🌐 " : b.origin === "fijo" ? "📌 " : b.origin === "bloqueo" ? "🚫 " : "") + b.name : sh ? "Ocupada (cancha compartida)" : "Libre"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
      {sel && (
        <SlotModal
          sel={sel}
          date={date}
          onClose={() => setSel(null)}
          onDone={(m) => {
            setSel(null);
            say(m);
            load();
          }}
        />
      )}
    </>
  );
}

function SlotModal({ sel, date, onClose, onDone }: { sel: Sel; date: string; onClose: () => void; onDone: (m: string) => void }) {
  const { court, start, booking: b } = sel;
  const [type, setType] = useState<"manual" | "fijo" | "bloqueo">("manual");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      onDone(msg);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  const head = (
    <>
      <h3>{court.name} · {hm(start)} hs</h3>
      <p className="mut small" style={{ marginBottom: 16 }}>{cap(fmtLong(date))} · Fútbol {court.tipo}</p>
    </>
  );

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        {head}
        {err && <div className="err">{err}</div>}
        {b ? (
          <div className="stack">
            <div className="card" style={{ background: "#0f0f0f" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{b.name}</div>
              <div className="mut small">
                {b.origin === "web" ? "Reservó por la web" : b.origin === "fijo" ? `Turno fijo todos los ${DOW_NAMES[dayOfWeek(date)]}` : b.origin === "bloqueo" ? "Horario bloqueado" : "Cargado a mano"}
                {b.price > 0 && ` · ${money(b.price)}`}
              </div>
              {b.phone && <div style={{ marginTop: 6 }}>📞 {b.phone}</div>}
            </div>
            {b.phone && (
              <a className="btn full" target="_blank" rel="noopener" href={waLink(b.phone, `Hola ${b.name.split(" ")[0]}! Te escribimos de M10 por tu turno del ${fmtLong(date)} a las ${hm(b.start)}.`)}>
                📲 Escribirle por WhatsApp
              </a>
            )}
            {b.origin === "fijo" ? (
              <>
                <button className="btn danger full" disabled={busy} onClick={() => run(() => api("/api/panel/turnos", "DELETE", { id: b.id, date, origin: "fijo", scope: "dia" }), "Liberado solo por este día")}>Liberar solo este día</button>
                <button className="btn danger full" disabled={busy} onClick={() => confirm("¿Borrar este turno fijo para siempre?") && run(() => api("/api/panel/turnos", "DELETE", { id: b.id, date, origin: "fijo", scope: "siempre" }), "Turno fijo borrado")}>Borrar turno fijo para siempre</button>
              </>
            ) : (
              <button className="btn danger full" disabled={busy} onClick={() => confirm(b.origin === "bloqueo" ? "¿Desbloquear este horario?" : `¿Cancelar el turno de ${b.name}?`) && run(() => api("/api/panel/turnos", "DELETE", { id: b.id, date }), b.origin === "bloqueo" ? "Horario desbloqueado" : "Turno cancelado")}>
                {b.origin === "bloqueo" ? "Desbloquear" : "Cancelar turno"}
              </button>
            )}
            <button className="btn ghost full" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="seg">
              <button className={type === "manual" ? "on" : ""} onClick={() => setType("manual")}>Reserva</button>
              <button className={type === "fijo" ? "on" : ""} onClick={() => setType("fijo")}>Fijo semanal</button>
              <button className={type === "bloqueo" ? "on" : ""} onClick={() => setType("bloqueo")}>Bloquear</button>
            </div>
            {type === "fijo" && <p className="mut small" style={{ marginBottom: 12 }}>Se repite todos los {DOW_NAMES[dayOfWeek(date)]} a las {hm(start)}.</p>}
            <div className="field">
              <label>{type === "bloqueo" ? "Motivo (opcional)" : "Nombre"}</label>
              <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "bloqueo" ? "Ej: Mantenimiento" : "Ej: Juan Pérez"} />
            </div>
            {type !== "bloqueo" && (
              <div className="field">
                <label>WhatsApp (opcional)</label>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 5555 0000" />
              </div>
            )}
            <div className="stack">
              <button className="btn big" disabled={busy || (type !== "bloqueo" && !name.trim())} onClick={() => run(() => api("/api/panel/turnos", "POST", { type, courtId: court.id, date, start, name, phone }), type === "bloqueo" ? "Horario bloqueado" : type === "fijo" ? "Turno fijo cargado ✓" : "Turno cargado ✓")}>
                {busy ? "Guardando…" : type === "bloqueo" ? "Bloquear horario" : "Guardar turno"}
              </button>
              <button className="btn ghost full" onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ======================= CANCHAS =======================
function Canchas({ courts: initial, onSaved }: { courts: Court[]; onSaved: (c: Court[]) => void }) {
  const [courts, setCourts] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const upd = (i: number, p: Partial<Court>) => setCourts(courts.map((c, j) => (j === i ? { ...c, ...p } : c)));

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ courts: Court[] }>("/api/panel/canchas", "PUT", { courts });
      setCourts(r.courts);
      onSaved(r.courts);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p className="mut" style={{ marginBottom: 14 }}>Acá cambiás nombre, tamaño, horarios y precios de cada cancha. Los cambios se ven en la web al guardar.</p>
      {courts.map((c, i) => (
        <div className="card" key={c.id} style={{ marginBottom: 14, opacity: c.active ? 1 : 0.6 }}>
          <div className="g2">
            <div className="field">
              <label>Nombre</label>
              <input type="text" value={c.name} onChange={(e) => upd(i, { name: e.target.value })} />
            </div>
            <div className="field">
              <label>Tamaño</label>
              <select value={c.tipo} onChange={(e) => upd(i, { tipo: Number(e.target.value) as Court["tipo"] })}>
                {TIPOS.map((t) => <option key={t} value={t}>Fútbol {t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Abre</label>
              <TimeInput value={c.open} onChange={(v) => upd(i, { open: v })} />
            </div>
            <div className="field">
              <label>Cierra</label>
              <TimeInput value={c.close} onChange={(v) => upd(i, { close: v })} />
            </div>
            <div className="field">
              <label>Precio de día</label>
              <input type="number" inputMode="numeric" value={c.priceDay || ""} placeholder="0" onChange={(e) => upd(i, { priceDay: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Precio de noche</label>
              <input type="number" inputMode="numeric" value={c.priceNight || ""} placeholder="igual que de día" onChange={(e) => upd(i, { priceNight: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Duración del turno</label>
              <select value={c.dur} onChange={(e) => upd(i, { dur: Number(e.target.value) })}>
                {[60, 90, 120].map((d) => <option key={d} value={d}>{d === 60 ? "1 hora" : d === 90 ? "1 hora y media" : "2 horas"}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Detalle (opcional)</label>
              <input type="text" value={c.detail} placeholder="Ej: Sintético" onChange={(e) => upd(i, { detail: e.target.value })} />
            </div>
          </div>
          {courts.length > 1 && (
            <div className="field">
              <label>¿Usa el mismo espacio que otra cancha?</label>
              <div className="row">
                {courts.filter((o) => o.id !== c.id).map((o) => (
                  <label key={o.id} className="switch" style={{ fontWeight: 400, marginRight: 10 }}>
                    <input type="checkbox" checked={c.shares.includes(o.id)} onChange={(e) => upd(i, { shares: e.target.checked ? [...c.shares, o.id] : c.shares.filter((s) => s !== o.id) })} />
                    {o.name}
                  </label>
                ))}
              </div>
              <p className="hint">Ej: si la de 11 se arma juntando las de 5, marcalas. Así cuando una está ocupada la otra no se puede reservar.</p>
            </div>
          )}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <label className="switch">
              <input type="checkbox" checked={c.active} onChange={(e) => upd(i, { active: e.target.checked })} /> Se puede reservar
            </label>
            <button className="btn sm danger" onClick={() => confirm(`¿Eliminar ${c.name}?`) && setCourts(courts.filter((_, j) => j !== i))}>Eliminar</button>
          </div>
        </div>
      ))}
      <button className="btn ghost full" onClick={() => setCourts([...courts, { id: "", name: `Cancha ${courts.length + 1}`, tipo: 5, detail: "", dur: 60, open: 540, close: 1440, priceDay: 0, priceNight: 0, shares: [], active: true }])}>
        + Agregar cancha
      </button>
      <div className="savebar">
        {err && <div className="err">{err}</div>}
        <button className="btn big" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar canchas"}</button>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts: number[] = [];
  for (let t = 0; t <= 1440; t += 30) opts.push(t);
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {opts.map((t) => <option key={t} value={t}>{t === 1440 ? "24:00" : hm(t)}</option>)}
    </select>
  );
}

// ======================= MI WEB =======================
function Web({ config, onSaved }: { config: Config; onSaved: (c: Config) => void }) {
  const [f, setF] = useState(config);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setF({ ...f, [k]: v });
  const setSvc = (i: number, p: Partial<Service>) => set("services", f.services.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ config: Config }>("/api/panel/config", "PUT", f);
      setF(r.config);
      onSaved(r.config);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  async function upload(kind: "logo" | "cover", file?: File | null) {
    setErr("");
    try {
      const dataUrl = file ? await shrink(file, kind === "logo" ? 512 : 1600) : "";
      const r = await api<{ config: Config }>("/api/panel/imagen", "POST", { kind, dataUrl });
      setF({ ...f, logoV: r.config.logoV, coverV: r.config.coverV });
      onSaved(r.config);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  const T = (k: keyof Config, label: string, ph = "", hint = "", area = false) => (
    <div className="field">
      <label>{label}</label>
      {area ? <textarea value={String(f[k])} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} /> : <input type="text" value={String(f[k])} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} />}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <div style={{ marginTop: 18 }}>
      <p className="mut" style={{ marginBottom: 14 }}>Todo lo que ven los clientes en la web. <a href="/" target="_blank" style={{ color: "var(--g)", textDecoration: "underline" }}>Ver mi web ↗</a></p>
      {err && <div className="err">{err}</div>}
      <div className="card" style={{ marginBottom: 14 }}>
        {T("notice", "Cartel de aviso arriba de todo", "Ej: Hoy cerramos a las 20 hs por lluvia", "Dejalo vacío para que no aparezca.")}
        {T("name", "Nombre del complejo")}
        {T("slogan", "Frase principal")}
        {T("description", "Descripción", "", "", true)}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>Contacto</h3>
        {T("whatsapp", "WhatsApp del complejo", "11 5555 0000", "Aparece el botón verde en la web.")}
        {T("address", "Dirección", "Ej: Av. Siempreviva 742, Lanús")}
        {T("mapsUrl", "Link de Google Maps (opcional)", "https://maps.app.goo.gl/...")}
        {T("hours", "Horarios", "Ej: Lunes a domingo de 9 a 24 hs")}
        {T("instagram", "Instagram", "usuario sin @")}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>Servicios</h3>
        {f.services.map((s, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 12 }}>
            <div className="field"><input type="text" value={s.title} placeholder="Título" onChange={(e) => setSvc(i, { title: e.target.value })} /></div>
            <div className="row">
              <input type="text" className="grow" style={{ width: "auto" }} value={s.text} placeholder="Texto" onChange={(e) => setSvc(i, { text: e.target.value })} />
              <button className="btn sm danger" onClick={() => set("services", f.services.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          </div>
        ))}
        <button className="btn sm ghost" onClick={() => set("services", [...f.services, { title: "", text: "" }])}>+ Agregar servicio</button>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>Imágenes</h3>
        {(["logo", "cover"] as const).map((k) => {
          const v = k === "logo" ? f.logoV : f.coverV;
          return (
            <div className="row" key={k} style={{ marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {v ? <img className="thumb" src={`/api/img/${k}?v=${v}`} alt="" /> : k === "logo" ? <img className="thumb" src="/logo.png" alt="" /> : <div className="thumb" />}
              <div className="grow">
                <b>{k === "logo" ? "Logo" : "Foto de portada"}</b>
                <div className="row" style={{ marginTop: 6 }}>
                  <label className="btn sm dark" style={{ marginBottom: 0 }}>
                    Cambiar
                    <input type="file" accept="image/*" hidden onChange={(e) => upload(k, e.target.files?.[0])} />
                  </label>
                  {v > 0 && <button className="btn sm ghost" onClick={() => upload(k, null)}>Quitar</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="savebar">
        <button className="btn big" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </div>
  );
}

/** Achica la foto en el celular antes de subirla */
function shrink(file: File, max: number): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      res(cv.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => rej(new Error("No se pudo leer la imagen."));
    img.src = URL.createObjectURL(file);
  });
}

// ======================= AJUSTES =======================
function Ajustes({ config, onSaved, say }: { config: Config; onSaved: (c: Config) => void; say: (m: string) => void }) {
  const [f, setF] = useState(config);
  const [night, setNight] = useState(hm(config.nightFrom));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });

  async function save() {
    const nf = parseHM(night);
    if (nf == null) return setErr("La hora de noche tiene que ser tipo 19:00");
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ config: Config }>("/api/panel/config", "PUT", { open: f.open, daysAhead: f.daysAhead, cancelHours: f.cancelHours, bookingNote: f.bookingNote, nightFrom: nf });
      onSaved(r.config);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  async function changePw() {
    try {
      await api("/api/panel/password", "POST", pw);
      setPw({ current: "", next: "" });
      say("Contraseña cambiada ✓");
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {err && <div className="err">{err}</div>}
      <div className="card" style={{ marginBottom: 14 }}>
        <label className="switch" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} />
          Reservas online abiertas
        </label>
        <p className="hint" style={{ marginBottom: 16 }}>Si lo apagás, la web muestra "Reservá por WhatsApp".</p>
        <div className="g2">
          <div className="field">
            <label>Días para reservar</label>
            <input type="number" value={f.daysAhead} onChange={(e) => setF({ ...f, daysAhead: Number(e.target.value) })} />
            <p className="hint">Cuántos días adelante.</p>
          </div>
          <div className="field">
            <label>Cancelar hasta</label>
            <input type="number" value={f.cancelHours} onChange={(e) => setF({ ...f, cancelHours: Number(e.target.value) })} />
            <p className="hint">Horas antes del turno.</p>
          </div>
          <div className="field">
            <label>Precio de noche desde</label>
            <input type="text" value={night} onChange={(e) => setNight(e.target.value)} placeholder="19:00" />
          </div>
        </div>
        <div className="field">
          <label>Mensaje al confirmar la reserva</label>
          <textarea value={f.bookingNote} onChange={(e) => setF({ ...f, bookingNote: e.target.value })} />
        </div>
        <button className="btn full" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Cambiar contraseña del panel</h3>
        <div className="field"><label>Actual</label><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
        <div className="field"><label>Nueva (mínimo 6)</label><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
        <button className="btn ghost full" disabled={!pw.current || pw.next.length < 6} onClick={changePw}>Cambiar contraseña</button>
        <p className="hint">Al cambiarla se cierran las sesiones en los otros celulares.</p>
      </div>
    </div>
  );
}
