import Link from "next/link";
import Booking from "./Booking";
import { IconArrow, IconClock, IconInstagram, IconPin, IconWhatsApp, SERVICE_ICONS } from "./icons";
import { getSite } from "@/lib/data";
import { todayStr } from "@/lib/time";
import { TIPOS } from "@/lib/types";
import { waLink } from "@/lib/util";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Elegí tu cancha", text: "Fútbol 5, 7, 9 u 11, según cuántos sean." },
  { title: "Día y horario", text: "Ves en tiempo real qué turnos están libres." },
  { title: "Confirmá y listo", text: "Sin llamadas ni esperas. La reserva queda al instante." },
];

export default async function Home() {
  const { config, courts } = await getSite();
  const logo = config.logoV ? `/api/img/logo?v=${config.logoV}` : "/logo.png";
  const wa = config.whatsapp ? waLink(config.whatsapp, "Hola! Quiero hacer una consulta.") : "";
  const active = courts.filter((c) => c.active);
  const tipos = TIPOS.map((tipo) => {
    const mine = active.filter((c) => c.tipo === tipo);
    const prices = mine.map((c) => c.priceDay).filter((p) => p > 0);
    return { tipo, count: mine.length, from: prices.length ? Math.min(...prices) : 0 };
  }).filter((t) => t.count > 0);

  return (
    <>
      {config.notice && <div className="notice">{config.notice}</div>}

      <header className="top">
        <div className="wrap wide">
          <a href="#inicio" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={config.name} />
            <span className="brand-name">{config.name}</span>
          </a>
          <nav className="nav" aria-label="Principal">
            <a href="#como">Cómo funciona</a>
            {config.services.length > 0 && <a href="#servicios">Servicios</a>}
            <a href="#ubicacion">Dónde estamos</a>
          </nav>
          <a href="#reservar" className="btn sm">Reservar</a>
        </div>
      </header>

      <section
        id="inicio"
        className={"hero" + (config.coverV ? " photo" : "")}
        style={config.coverV ? { backgroundImage: `url(/api/img/cover?v=${config.coverV})` } : undefined}
      >
        <div className="pitch" aria-hidden />
        <div className="wrap wide hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><i /> Reservas online 24/7</span>
            <h1 className="display">{config.slogan || config.name}</h1>
            {config.description && <p className="lead">{config.description}</p>}
            <div className="row hero-cta">
              <a href="#reservar" className="btn big">Reservar cancha <IconArrow size={20} /></a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="btn ghost big">
                  <IconWhatsApp size={20} /> Consultar
                </a>
              )}
            </div>
            <dl className="facts">
              <div><dt>{active.length}</dt><dd>Canchas</dd></div>
              <div><dt>{tipos.length > 0 ? tipos.map((t) => t.tipo).join(" · ") : "—"}</dt><dd>Formatos</dd></div>
              <div><dt>1 min</dt><dd>Para reservar</dd></div>
            </dl>
          </div>
          <div className="hero-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
          </div>
        </div>
      </section>

      <section className="band" id="como">
        <div className="wrap wide">
          <div className="steps3">
            {STEPS.map((s, i) => (
              <div className="how" key={i}>
                <span className="how-n">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p className="mut">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="wrap">
        <section className="sec" id="reservar" style={{ scrollMarginTop: 80 }}>
          <div className="sec-head">
            <span className="kicker">Reservas</span>
            <h2 className="display">Reservá tu cancha</h2>
            <p className="mut">Elegí formato, día y horario. La confirmación es inmediata.</p>
          </div>
          <div className="panel-card">
            <Booking tipos={tipos} today={todayStr()} daysAhead={config.daysAhead} open={config.open} wa={wa} />
          </div>
        </section>
      </main>

      {config.services.length > 0 && (
        <section className="sec tint" id="servicios">
          <div className="wrap wide">
            <div className="sec-head">
              <span className="kicker">Servicios</span>
              <h2 className="display">Qué tenemos</h2>
            </div>
            <div className="cards">
              {config.services.map((s, i) => {
                const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                return (
                  <div className="card svc" key={i}>
                    <span className="ico"><Icon size={24} /></span>
                    <h3>{s.title}</h3>
                    <p className="mut">{s.text}</p>
                  </div>
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

      <section className="sec" id="ubicacion">
        <div className="wrap wide">
          <div className="sec-head">
            <span className="kicker">Contacto</span>
            <h2 className="display">Dónde estamos</h2>
          </div>
          <div className="cards info-grid">
            {config.address && (
              <div className="card info-item">
                <span className="ico"><IconPin size={22} /></span>
                <div>
                  <small className="mut">Dirección</small>
                  <b>{config.address}</b>
                  <a className="link" target="_blank" rel="noopener" href={config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`}>
                    Cómo llegar →
                  </a>
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
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap wide foot-in">
          <span>© {new Date().getFullYear()} {config.name}</span>
          <Link href="/panel">Administración</Link>
        </div>
      </footer>

      {wa && (
        <a className="fab" href={wa} target="_blank" rel="noopener" aria-label="WhatsApp">
          <IconWhatsApp size={30} />
        </a>
      )}
    </>
  );
}
