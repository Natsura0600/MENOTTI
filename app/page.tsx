import type { Metadata } from "next";
import Link from "next/link";
import Booking from "./Booking";
import { buildJsonLd, getSiteCached } from "@/lib/site";
import { todayStr } from "@/lib/time";
import { waLink } from "@/lib/util";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

const WaIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm-3.2 5.5c.3 0 .5 0 .7.5l.9 2.1c.1.3 0 .5-.1.7l-.6.8c-.2.2-.2.4 0 .7.9 1.6 2.200 2.800 3.800 3.600.300.100.500.100.700-.100l.800-1c.200-.200.400-.300.700-.200l2.100 1c.300.100.400.300.400.600 0 1.200-1 2.100-2.200 2.100-4.300-.300-7.900-3.900-8.200-8.200 0-1.200.900-2.200 2-2.200Z" />
  </svg>
);

export default async function Home() {
  const { config, courts } = await getSiteCached();
  const photos = config.photos ?? [];
  const logo = config.logoV ? `/api/img/logo?v=${config.logoV}` : "/logo.png";
  const wa = config.whatsapp ? waLink(config.whatsapp, "Hola! Quiero hacer una consulta.") : "";
  // El cliente elige la cancha puntual (Cancha 1, 2, 3...), no el tamaño
  const canchas = courts.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name, tipo: c.tipo, detail: c.detail, from: c.priceDay }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(config, courts)).replace(/</g, "\\u003c") }} />
      {config.notice && <div className="notice">{config.notice}</div>}
      <header className="top">
        <div className="wrap">
          <a href="#" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={config.name} />
          </a>
          <a href="#reservar" className="btn sm">Reservar</a>
        </div>
      </header>

      <section className={"hero" + (config.coverV ? " photo" : "")} style={config.coverV ? { backgroundImage: `url(/api/img/cover?v=${config.coverV})` } : undefined}>
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src={logo} alt={config.name} />
          <h1 className="title">{config.slogan || config.name}</h1>
          {config.description && <p>{config.description}</p>}
          <a href="#reservar" className="btn big" style={{ maxWidth: 380 }}>⚽ Reservá ya</a>
        </div>
      </section>

      <main className="wrap">
        <section className="sec" id="reservar" style={{ scrollMarginTop: 70 }}>
          <h2 className="title">Reservá tu cancha</h2>
          <Booking courts={canchas} today={todayStr()} daysAhead={config.daysAhead} open={config.open} fijosWeb={config.fijosWeb} wa={wa} />
        </section>

        {photos.length > 0 && (
          <section className="sec" id="fotos">
            <h2 className="title">Nuestras canchas</h2>
            <div className="fotos">
              {photos.map((p, i) => (
                <figure key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/img/foto_${p.id}?v=${p.v}`} alt={p.caption || `Cancha de fútbol de ${config.name}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
            <a href="#reservar" className="btn full" style={{ marginTop: 14 }}>Reservar un turno</a>
          </section>
        )}

        {config.services.length > 0 && (
          <section className="sec">
            <h2 className="title">Qué tenemos</h2>
            <div className="cards">
              {config.services.map((s, i) => (
                <div className="card" key={i}>
                  <h3>{s.title}</h3>
                  <p className="mut">{s.text}</p>
                </div>
              ))}
            </div>
            {wa && (
              <a href={waLink(config.whatsapp, "Hola! Quiero consultar por un evento / cumpleaños.")} target="_blank" rel="noopener" className="btn ghost full" style={{ marginTop: 14 }}>
                <WaIcon /> Consultar por eventos
              </a>
            )}
          </section>
        )}

        <section className="sec">
          <h2 className="title">Dónde estamos</h2>
          <div className="card">
            <ul className="info">
              {config.address && (
                <li>
                  <span>📍</span>
                  <div>
                    <b>{config.address}</b>
                    <br />
                    <a className="mut" style={{ textDecoration: "underline" }} target="_blank" rel="noopener" href={config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`}>
                      Cómo llegar
                    </a>
                  </div>
                </li>
              )}
              {config.hours && (
                <li>
                  <span>🕒</span>
                  <b>{config.hours}</b>
                </li>
              )}
              {wa && (
                <li>
                  <span>📲</span>
                  <a href={wa} target="_blank" rel="noopener"><b>Escribinos por WhatsApp</b></a>
                </li>
              )}
              {config.instagram && (
                <li>
                  <span>📷</span>
                  <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener"><b>@{config.instagram}</b></a>
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          {config.name} · <Link href="/panel" style={{ textDecoration: "underline" }}>Administración</Link>
          <p className="legal-links">
            <Link href="/terminos">Términos y condiciones</Link> · <Link href="/privacidad">Política de privacidad</Link>
          </p>
          <p className="credit">
            Sitio desarrollado por{" "}
            <a href="https://picturewebdev.vercel.app" target="_blank" rel="noopener">Picture Web Dev</a>
          </p>
        </div>
      </footer>

      {wa && (
        <a className="fab" href={wa} target="_blank" rel="noopener" aria-label="WhatsApp" style={{ color: "#fff" }}>
          <WaIcon size={32} />
        </a>
      )}
    </>
  );
}
