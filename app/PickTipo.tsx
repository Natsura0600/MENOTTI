"use client";

/** Botón de las tarjetas de canchas: deja elegido ese tamaño en el formulario de reserva */
export default function PickTipo({ tipo, children }: { tipo: number; children: React.ReactNode }) {
  return (
    <a
      href="#reservar"
      className="btn ghost sm full"
      onClick={() => window.dispatchEvent(new CustomEvent("m10:tipo", { detail: tipo }))}
    >
      {children}
    </a>
  );
}
