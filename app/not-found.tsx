import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap center" style={{ padding: "80px 16px" }}>
      <h1 className="title" style={{ fontSize: 32, marginBottom: 12 }}>No encontramos esa página</h1>
      <Link href="/" className="btn">Ir al inicio</Link>
    </div>
  );
}
