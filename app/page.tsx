import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Booking from "./Booking";
import PickTipo from "./PickTipo";
import { IconArrow, IconCalendar, IconCheck, IconClock, IconInstagram, IconPin, IconShield, IconWhatsApp, SERVICE_ICONS } from "./icons";
import { buildFaqs, buildJsonLd, getSiteCached } from "@/lib/site";
import { hm, todayStr } from "@/lib/time";
import { TIPOS } from "@/lib/types";
import { money, waLink } from "@/lib/util";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  { title: "Elegí tu cancha", text: "Fútbol 7, 9 u 11, según cuántos sean." },
  { title: "Día y horario", text: "Ves en tiempo real qué turnos están libres." },
  { title: "Confirmá y listo", text: "Sin llamadas ni esperas. La reserva queda al instante." },
];
const JUGADORES: Record<number, string> = { 7: "7 contra 7", 9: "9 contra 9", 11: "11 contra 11" };

function Logo({ src, custom, size, alt, priority }: { src: string; custom: boolean; size: number; alt: string; priority?: boolean }) {
  // El logo propio (subido desde el panel) ya viene liviano; el de fábrica lo optimiza Next (WebP/AVIF a medida)
  if (custom)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={size} height={size} decoding="async" fetchPriority={priority ? "high" : undefined} />;
  return <Image src={src} alt={alt} width={size} height={size} priority={priority} />;
}

export default async function Home() {
  const { config, courts } = await getSiteCached();
  const custom = !!config.logoV;
  const logo = custom ? `/api/img/logo?v=${config.logoV}` : "/logo.png";
  const wa = config.whatsapp ? waLink(config.whatsapp, "Hola! Quiero hacer una consulta.") : "";
  const active = courts.filter((c) => c.active);
  const tipos = TIPOS.map((tipo) => {
    const mine = active.filter((c) => c.tipo === tipo);
    const prices = mine.map((c) => c.priceDay).filter((p) => p > 0);
    const nights = mine.map((c) => c.priceNight).filter((p) => p > 0);
    return {
      tipo,
      count: mine.length,
      from: prices.length ? Math.min(...prices) : 0,
      night: nights.length ? Math.min(...nights) : 0,
      detail: mine.find((c) => c.detail)?.detail ?? "",
      dur: mine[0]?.dur ?? 60,
      open: mine.length ? Math.min(...mine.map((c) => c.open)) : 0,
      close: mine.length ? Math.max(...mine.map((c) => c.close)) : 0,
    };
  }).filter((t) => t.count > 0);
  const faqs = buildFaqs(config);
  const jsonLd = buildJsonLd(config, courts, faqs);
  const mapQuery = config.address ? encodeURIComponent(`${config.name}, ${config.address}`) : "";
  const mapsHref = config.mapsUrl || (config.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}` : "");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {config.notice && <div className="notice" role="status">{config.notice}</div>}

      <header className="top">
        <div className="wrap wide">
          <a href="#inicio" className="brand" aria-label={`${config.name} — inicio`}>
            <Logo src={logo} custom={custom} size={42} alt="" />
            <span className="brand-name">{config.name}</span>
          </a>
          <nav className="nav" aria-label="Principal">
            <a href="#canchas">Canchas</a>
            {config.services.length > 0 && <a href="#servicios">Servicios</a>}
            <a href="#preguntas">Preguntas</a>
            <a href="#ubicacion">Dónde estamos</a>
          </nav>
          <a href="#reservar" className="btn sm">Reservar</a>
        </div>
      </header>

      <main id="contenido">
        <section id="inicio" className={"hero" + (config.coverV ? " photo" : "")} style={config.coverV ? { backgroundImage: `url(/api/img/cover?v=${config.coverV})` } : undefined}>
          <div className="pitch" aria-hidden />
          <div className="wrap wide hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><i /> {config.open ? "Reservas online abiertas · 24/7" : "Reservas por WhatsApp"}</p>
              <h1 className="display">{config.slogan || config.name}</h1>
              {config.description && <p className="lead">{config.description}</p>}
              <div className="row hero-cta">
                <a href="#reservar" className="btn big">Reservar cancha <IconArrow size={20} /></a>
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener" className="btn ghost big"><IconWhatsApp size={20} /> Consultar</a>
                ) : (
                  <a href="#canchas" className="btn ghost big">Ver canchas</a>
                )}
              </div>
              <dl className="facts">
                <div><dt>{active.length}</dt><dd>{active.length === 1 ? "Cancha" : "Canchas"}</dd></div>
                <div><dt>{tipos.length > 0 ? tipos.map((t) => t.tipo).join(" · ") : "—"}</dt><dd>Fútbol</dd></div>
                <div><dt>1 min</dt><dd>Para reservar</dd></div>
              </dl>
            </div>
            <div className="hero-logo">
              <Logo src={logo} custom={custom} size={320} alt={`Logo de ${config.name}`} priority />
            </div>
          </div>
        </section>

        <section className="band" aria-label="Cómo funciona">
          <ol className="wrap wide steps3">
            {STEPS.map((s, i) => (
              <li className="how" key={i}>
                <span className="how-n" aria-hidden>0{i + 1}</span>
                <h2>{s.title}</h2>
                <p className="mut">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="sec" id="reservar">
          <div className="wrap wide book-grid">
            <div className="book-side">
              <span className="kicker">Reservas online</span>
              <h2 className="display">Reservá tu cancha</h2>
              <p className="mut">Elegí formato, día y horario. La confirmación es inmediata.</p>
              <ul className="ticks">
                <li><IconCheck size={18} /> Disponibilidad en tiempo real</li>
                <li><IconCalendar size={18} /> Hasta {config.daysAhead} días de anticipación</li>
                <li><IconShield size={18} /> Cancelás online hasta {config.cancelHours} h antes</li>
              </ul>
              {config.bookingNote && <p className="note">{config.bookingNote}</p>}
            </div>
            <div className="panel-card">
              <Booking tipos={tipos.map(({ tipo, count, from }) => ({ tipo, count, from }))} today={todayStr()} daysAhead={config.daysAhead} open={config.open} wa={wa} />
            </div>
          </div>
        </section>

        {tipos.length > 0 && (
          <section className="sec tint" id="canchas">
            <div className="wrap wide">
              <div className="sec-head">
                <span className="kicker">Nuestras canchas</span>
                <h2 className="display">Canchas de fútbol {tipos.map((t) => t.tipo).join(", ").replace(/, (\d+)$/, " y $1")}</h2>
                <p className="mut">Alquiler por turno. Elegí el tamaño según cuántos jueguen.</p>
              </div>
              <div className="cards">
                {tipos.map((t) => (
                  <article className="card court-card" key={t.tipo}>
                    <header>
                      <h3 className="display">Fútbol {t.tipo}</h3>
                      <span className="chip">{t.count} {t.count === 1 ? "cancha" : "canchas"}</span>
                    </header>
                    <ul>
                      <li>{JUGADORES[t.tipo]}{t.detail ? ` · ${t.detail}` : ""}</li>
                      <li>Turnos de {t.dur} min · {hm(t.open)} a {t.close >= 1440 ? "24:00" : hm(t.close)}</li>
                    </ul>
                    <p className="price">
                      {t.from > 0 ? (
                        <>
                          <small className="mut">Desde</small> <b>{money(t.from)}</b>
                          {t.night > 0 && t.night !== t.from && <small className="mut"> · noche {money(t.night)}</small>}
                        </>
                      ) : (
                        <small className="mut">Consultá el precio al reservar</small>
                      )}
                    </p>
                    <PickTipo tipo={t.tipo}>Reservar fútbol {t.tipo}</PickTipo>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {config.services.length > 0 && (
          <section className="sec" id="servicios">
            <div className="wrap wide">
              <div className="sec-head">
                <span className="kicker">Servicios</span>
                <h2 className="display">Qué tenemos</h2>
              </div>
              <div className="cards">
                {config.services.map((s, i) => {
                  const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                  return (
                    <article className="card svc" key={i}>
                      <span className="ico"><Icon size={24} /></span>
                      <h3>{s.title}</h3>
                      <p className="mut">{s.text}</p>
                    </article>
                  );
                })}
              </div>
              {wa && (
                <a href={waLink(config.whatsapp, "Hola! Quiero consultar por un evento / cumpleaños.")} target="_blank" rel="noopener" className="btn ghost" style={{ marginTop: 20 }}>
                  <IconWhatsApp size={20} /> Consultar por eventos
                </a>
              )}
            </div>
          </section>
        )}

        <section className="sec tint" id="preguntas">
          <div className="wrap">
            <div className="sec-head">
              <span className="kicker">Preguntas frecuentes</span>
              <h2 className="display">Todo lo que necesitás saber</h2>
            </div>
            <div className="faq">
              {faqs.map((f, i) => (
                <details key={i} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p className="mut">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="ubicacion">
          <div className="wrap wide">
            <div className="sec-head">
              <span className="kicker">Contacto</span>
              <h2 className="display">Dónde estamos</h2>
            </div>
            <div className={"loc" + (mapQuery ? " has-map" : "")}>
              <address className="cards info-grid">
                {config.address && (
                  <div className="card info-item">
                    <span className="ico"><IconPin size={22} /></span>
                    <div>
                      <small className="mut">Dirección</small>
                      <b>{config.address}</b>
                      <a className="link" target="_blank" rel="noopener" href={mapsHref}>Cómo llegar →</a>
                    </div>
                  </div>
                )}
                {config.hours && (
                  <div className="card info-item">
                    <span className="ico"><IconClock size={22} /></span>
                    <div>
                      <small className="mut">Horarios</small>
                      <b>{config.hours}</b>
                    </div>
                  </div>
                )}
                {wa && (
                  <div className="card info-item">
                    <span className="ico"><IconWhatsApp size={22} /></span>
                    <div>
                      <small className="mut">WhatsApp</small>
                      <a href={wa} target="_blank" rel="noopener"><b>Escribinos</b></a>
                    </div>
                  </div>
                )}
                {config.instagram && (
                  <div className="card info-item">
                    <span className="ico"><IconInstagram size={22} /></span>
                    <div>
                      <small className="mut">Instagram</small>
                      <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener"><b>@{config.instagram}</b></a>
                    </div>
                  </div>
                )}
              </address>
              {mapQuery && (
                <iframe className="map" title={`Mapa: ${config.address}`} src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              )}
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="wrap wide cta-in">
            <div>
              <h2 className="display">¿Sale un partido?</h2>
              <p className="mut">Reservá ahora y asegurá tu horario.</p>
            </div>
            <a href="#reservar" className="btn big">Reservar cancha <IconArrow size={20} /></a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap wide foot-grid">
          <div>
            <b className="foot-name">{config.name}</b>
            {config.address && <p>{config.address}</p>}
            {config.hours && <p>{config.hours}</p>}
          </div>
          <nav aria-label="Pie de página">
            <a href="#reservar">Reservar</a>
            <a href="#canchas">Canchas</a>
            <a href="#preguntas">Preguntas frecuentes</a>
            <a href="#ubicacion">Dónde estamos</a>
          </nav>
          <div className="foot-social">
            {wa && <a href={wa} target="_blank" rel="noopener" aria-label="WhatsApp"><IconWhatsApp size={22} /></a>}
            {config.instagram && <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener" aria-label="Instagram"><IconInstagram size={22} /></a>}
          </div>
        </div>
        <div className="wrap wide foot-in">
          <span>© {new Date().getFullYear()} {config.name}. Todos los derechos reservados.</span>
          <Link href="/panel" rel="nofollow">Administración</Link>
        </div>
      </footer>

      {wa && (
        <a className="fab" href={wa} target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">
          <IconWhatsApp size={30} />
        </a>
      )}
    </>
  );
}
