import { notFound } from "next/navigation";
import Link from "next/link";
import CancelButton from "./CancelButton";
import FijoActions from "./FijoActions";
import TrackReserva from "./TrackReserva";
import { findFijo, findReserva, getSite, nextFijoDates, priceOf } from "@/lib/data";
import { cap, DOW_NAMES, fmtLong, hm, minutesUntil } from "@/lib/time";
import { money, waLink } from "@/lib/util";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu reserva", robots: { index: false, follow: false } };

export default async function ReservaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; nuevo?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (id.startsWith("f_")) return <FijoPage id={id} t={sp.t} nuevo={!!sp.nuevo} />;
  const [r, { config, courts }] = await Promise.all([findReserva(id), getSite()]);
  if (!r || r.token !== sp.t) notFound();
  const court = courts.find((c) => c.id === r.courtId);
  const left = minutesUntil(r.date, r.start);
  const canCancel = left >= config.cancelHours * 60;
  const share = `⚽ Ya está la cancha! ${court ? `Fútbol ${court.tipo}` : "Fútbol"} en ${config.name}\n📅 ${cap(fmtLong(r.date))} · ${hm(r.start)} hs${config.address ? `\n📍 ${config.address}` : ""}\n¿Quién juega?`;
  const msg = `Hola! Tengo reserva a nombre de ${r.name}: ${court ? `Fútbol ${court.tipo} (${court.name})` : ""} el ${fmtLong(r.date)} a las ${hm(r.start)}.`;

  return (
    <main className="wrap" style={{ padding: "36px 16px 60px", maxWidth: 520 }}>
      {sp.nuevo && court && <TrackReserva id={r.id} cancha={court.name} tipo={court.tipo} />}
      {sp.nuevo && (
        <div className="center" style={{ marginBottom: 22 }}>
          <div className="check">✓</div>
          <h1 className="title" style={{ fontSize: 30 }}>¡Listo, reservado!</h1>
          <p className="mut" style={{ marginTop: 6 }}>Te esperamos. Guardá esta página por si querés cancelar.</p>
        </div>
      )}
      <div className="card">
        <div className="kv"><span className="mut">Cancha</span><b>{court ? `Fútbol ${court.tipo} · ${court.name}` : "—"}</b></div>
        <div className="kv"><span className="mut">Día</span><b>{cap(fmtLong(r.date))}</b></div>
        <div className="kv"><span className="mut">Hora</span><b>{hm(r.start)} a {hm(r.start + r.dur)} hs</b></div>
        <div className="kv"><span className="mut">A nombre de</span><b>{r.name}</b></div>
        {r.price > 0 && <div className="kv" style={{ border: 0 }}><span className="mut">Precio</span><b>{money(r.price)}</b></div>}
      </div>
      {config.bookingNote && <p className="mut small center" style={{ margin: "14px 0" }}>{config.bookingNote}</p>}
      {config.address && <p className="center" style={{ margin: "14px 0" }}>📍 {config.address}</p>}
      <div className="stack" style={{ marginTop: 18 }}>
        {left > 0 && <a className="btn full" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener">📣 Avisarle al equipo por WhatsApp</a>}
        {config.whatsapp && <a className="btn ghost full" href={waLink(config.whatsapp, msg)} target="_blank" rel="noopener">📲 Escribirle al complejo</a>}
        {left > 0 && (canCancel ? <CancelButton id={r.id} token={r.token} /> : <p className="mut small center">Faltan menos de {config.cancelHours} hs: para cancelar escribinos por WhatsApp.</p>)}
        <Link className="btn ghost full" href="/">Volver al inicio</Link>
      </div>
    </main>
  );
}

/** Comprobante de un turno fijo sacado desde la web */
async function FijoPage({ id, t, nuevo }: { id: string; t?: string; nuevo: boolean }) {
  const [f, { config, courts }] = await Promise.all([findFijo(id), getSite()]);
  if (!f || !f.web || f.token !== t) notFound();
  const court = courts.find((c) => c.id === f.courtId);
  const dias = DOW_NAMES[f.dow];
  const dates = await nextFijoDates(f, 3);
  const next = dates.map((d) => ({ date: d, label: fmtLong(d), canSkip: minutesUntil(d, f.start) >= config.cancelHours * 60 }));
  const price = court ? priceOf(court, f.start, config.nightFrom) : 0;
  const wa = config.whatsapp ? waLink(config.whatsapp, `Hola! Tengo turno fijo a nombre de ${f.name}: ${court?.name ?? ""} todos los ${dias} a las ${hm(f.start)}.`) : "";
  const share = `⚽ Tenemos cancha fija! ${court ? `${court.name} · Fútbol ${court.tipo}` : "Fútbol"} en ${config.name}\n📅 Todos los ${dias} · ${hm(f.start)} hs${config.address ? `\n📍 ${config.address}` : ""}\n¿Quién se suma?`;

  return (
    <main className="wrap" style={{ padding: "36px 16px 60px", maxWidth: 520 }}>
      {nuevo && court && <TrackReserva id={f.id} cancha={court.name} tipo={court.tipo} />}
      {nuevo && (
        <div className="center" style={{ marginBottom: 22 }}>
          <div className="check">✓</div>
          <h1 className="title" style={{ fontSize: 30 }}>¡Listo, turno fijo!</h1>
          <p className="mut" style={{ marginTop: 6 }}>Tenés este horario todas las semanas. Guardá esta página para avisar si una semana no venís.</p>
        </div>
      )}
      <div className="card">
        <div className="kv"><span className="mut">Cancha</span><b>{court ? `Fútbol ${court.tipo} · ${court.name}` : "—"}</b></div>
        <div className="kv"><span className="mut">Cuándo</span><b>Todos los {dias}</b></div>
        <div className="kv"><span className="mut">Hora</span><b>{hm(f.start)} a {hm(f.start + f.dur)} hs</b></div>
        <div className="kv"><span className="mut">A nombre de</span><b>{f.name}</b></div>
        {price > 0 && <div className="kv"><span className="mut">Precio</span><b>{money(price)} por turno</b></div>}
        <div className="kv" style={{ border: 0 }}>
          <span className="mut">Próximos</span>
          <b>{dates.length ? dates.map((d) => cap(fmtLong(d)).replace(/^[^,]+, /, "")).join(" · ") : "—"}</b>
        </div>
      </div>
      {config.bookingNote && <p className="mut small center" style={{ margin: "14px 0" }}>{config.bookingNote}</p>}
      {config.address && <p className="center" style={{ margin: "14px 0" }}>📍 {config.address}</p>}
      <div className="stack" style={{ marginTop: 18 }}>
        <a className="btn full" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener">📣 Avisarle al equipo por WhatsApp</a>
        {wa && <a className="btn ghost full" href={wa} target="_blank" rel="noopener">📲 Escribirle al complejo</a>}
        <FijoActions id={f.id} token={f.token!} next={next} cancelHours={config.cancelHours} wa={wa} />
        <Link className="btn ghost full" href="/">Volver al inicio</Link>
      </div>
    </main>
  );
}
