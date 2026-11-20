import type { Metadata } from "next";
import { Contacto, LegalPage, titular } from "../_legal/Legal";
import { getSiteCached } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

export default async function Privacidad() {
  const { config: c } = await getSiteCached();
  const t = titular(c);
  return (
    <LegalPage title="Política de privacidad">
      <p>
        Esta política explica qué datos personales se piden al reservar en este sitio, para qué se usan y qué derechos tenés
        sobre ellos, conforme a la Ley 25.326 de Protección de Datos Personales.
      </p>

      <h2>1. Responsable de los datos</h2>
      <div className="box">
        <p>
          <b>{t.who}</b>
          {t.who !== c.name && <> ({c.name})</>}
          {t.cuit && <> · CUIT {t.cuit}</>}
          {t.address && <><br />{t.address}</>}
        </p>
      </div>

      <h2>2. Qué datos pedimos</h2>
      <ul>
        <li><b>Nombre y apellido.</b></li>
        <li><b>Número de WhatsApp.</b></li>
        <li>Los datos del turno: cancha, día y horario.</li>
      </ul>
      <p>No pedimos documento, dirección, email ni datos de pago.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Registrar y administrar tu reserva.</li>
        <li>Contactarte por WhatsApp por tu turno: confirmaciones, cambios o suspensiones.</li>
        <li>Evitar abusos, como reservas repetidas desde el mismo teléfono.</li>
      </ul>
      <p>No usamos tus datos para publicidad ni los vendemos.</p>

      <h2>4. Con quién se comparten</h2>
      <p>
        Tus datos solo los ve el personal del complejo que administra las reservas. No se comparten con terceros, salvo con los
        proveedores técnicos que alojan este sitio y su base de datos (Vercel y Upstash), que pueden guardarlos en servidores
        fuera de la Argentina y solo los procesan para que el sitio funcione. También podrían entregarse a una autoridad si una
        ley o un juez lo exige.
      </p>

      <h2>5. Cuánto tiempo se guardan</h2>
      <p>
        Mientras sean necesarios para administrar las reservas y llevar el registro de turnos del complejo. Podés pedir que se
        borren en cualquier momento (ver punto 7).
      </p>

      <h2>6. Datos en tu celular y estadísticas</h2>
      <ul>
        <li>
          Para mostrarte &quot;Tu reserva&quot; y no hacerte escribir tus datos de nuevo, este sitio guarda tu nombre, tu WhatsApp
          y tus últimas reservas en la memoria de tu propio navegador. Podés borrarlos limpiando los datos del sitio en tu
          navegador.
        </li>
        <li>
          Usamos estadísticas de visitas anónimas (Vercel Web Analytics), que no usan cookies ni identifican a las personas.
        </li>
        <li>No usamos cookies de publicidad ni de seguimiento.</li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>
        Podés pedir en forma gratuita ver qué datos tuyos tenemos, corregirlos o que se borren. Para hacerlo, escribinos{" "}
        <Contacto c={c} motivo="Hola! Quiero hacer un pedido sobre mis datos personales." />. Respondemos dentro de los plazos
        que fija la ley (10 días corridos para el acceso y 5 días hábiles para la corrección o el borrado).
      </p>
      <p>
        La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución
        de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las
        normas vigentes en materia de protección de datos personales.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        El sitio funciona con conexión cifrada (HTTPS) y el acceso a las reservas está protegido con contraseña. Solo el personal
        autorizado del complejo puede verlas.
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>Esta política puede actualizarse. La versión vigente es la publicada en esta página.</p>
    </LegalPage>
  );
}
