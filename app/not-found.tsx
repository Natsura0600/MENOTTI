import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="wrap center" style={{ padding: "96px 16px" }}>
      <p className="kicker">Error 404</p>
      <h1 className="title" style={{ fontSize: 32, marginBottom: 12 }}>No encontramos esa página</h1>
      <Link href="/" className="btn">Ir al inicio</Link>
    </main>
  );
}
