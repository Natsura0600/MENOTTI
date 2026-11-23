import type { Metadata } from "next";
import { Contacto, LegalPage, titular } from "../_legal/Legal";
import { MAX_FIJOS_TEL, MAX_TURNOS_DIA } from "@/lib/data";
import { getSiteCached } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Términos y condiciones", alternates: { canonical: "/terminos" } };

export default async function Terminos() {
  const { config: c } = await getSiteCached();
  const t = titular(c);
  const horas = c.cancelHours === 1 ? "1 hora" : `${c.cancelHours} horas`;
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos rigen las reservas de canchas que se hacen a través de este sitio. Al confirmar una reserva, aceptás estas
        condiciones.
      </p>

      <h2>1. Quién presta el servicio</h2>
      <div className="box">
        <p>
          <b>{t.who}</b>
          {t.who !== c.name && <> ({c.name})</>}
          {t.cuit && <> · CUIT {t.cuit}</>}
          {t.address && <><br />{t.address}</>}
        </p>
      </div>

      <h2>2. Cómo funciona la reserva</h2>
      <ul>
        <li>Elegís la cancha, el día y el horario, y dejás tu nombre y tu WhatsApp.</li>
        <li>La reserva queda confirmada en el momento en que ves la pantalla &quot;¡Listo, reservado!&quot;.</li>
        <li>Se puede reservar desde hoy y hasta {c.daysAhead} días para adelante.</li>
        <li>Desde la web se pueden reservar hasta {MAX_TURNOS_DIA} turnos por teléfono por día (contando los turnos fijos). Para más turnos (torneos, eventos), consultanos.</li>
        <li>Los datos que cargues tienen que ser reales: el complejo puede usar tu WhatsApp para confirmar o avisarte por el turno.</li>
      </ul>

      <h2>3. Precio y pago</h2>
      <ul>
        <li>El precio de cada turno es el que se muestra al reservar. Puede variar según la cancha y el horario.</li>
        <li>El turno se paga en el complejo. La reserva online no cobra nada por adelantado.</li>
        <li>Las bebidas y otros consumos se pagan aparte, en el complejo.</li>
      </ul>

      <h2>4. Cancelaciones</h2>
      <ul>
        <li>
          Podés cancelar tu reserva desde la página de tu reserva hasta <b>{horas} antes</b> del turno.
        </li>
        <li>
          Con menos anticipación, avisanos <Contacto c={c} motivo="Hola! Quiero cancelar mi turno." />.
        </li>
        <li>
          Si reservás y no venís sin avisar, el complejo puede no aceptar nuevas reservas online a tu nombre.
        </li>
      </ul>

      {c.fijosWeb && (
        <>
          <h2>5. Turnos fijos</h2>
          <ul>
            <li>Al reservar podés elegir &quot;Todas las semanas&quot;: el mismo día, horario y cancha queda reservado cada semana, desde la fecha elegida.</li>
            <li>Solo se puede sacar si el horario está libre las semanas siguientes.</li>
            <li>Cada turno se paga en el complejo, al precio vigente ese día.</li>
            <li>
              Si una semana no podés venir, avisalo desde la página de tu turno fijo hasta <b>{horas} antes</b>: ese día queda libre y las
              demás semanas seguís teniendo tu horario. Con menos anticipación, avisanos <Contacto c={c} motivo="Hola! Una semana no voy a poder ir a mi turno fijo." />.
            </li>
            <li>Podés dar de baja tu turno fijo cuando quieras, desde la misma página.</li>
            <li>Cada teléfono puede tener hasta {MAX_FIJOS_TEL} turnos fijos sacados desde la web.</li>
            <li>Si faltás sin avisar en forma repetida, el complejo puede dar de baja tu turno fijo y avisarte por WhatsApp.</li>
          </ul>
        </>
      )}

      <h2>{c.fijosWeb ? 6 : 5}. Cambios o suspensiones por parte del complejo</h2>
      <p>
        El complejo puede suspender o reprogramar un turno por lluvia o mal estado de la cancha, tareas de mantenimiento, cortes
        de luz u otras causas de fuerza mayor. En ese caso te avisamos por WhatsApp lo antes posible y coordinamos otro horario.
        Como el pago es en el complejo, no hay importes que devolver.
      </p>

      <h2>{c.fijosWeb ? 7 : 6}. Uso de las instalaciones</h2>
      <ul>
        <li>Respetá el horario reservado: el turno siguiente empieza a la hora indicada.</li>
        <li>Cuidá las instalaciones y respetá las indicaciones del personal.</li>
        <li>
          La actividad deportiva tiene riesgos propios. Cada jugador participa bajo su responsabilidad y debe estar en condiciones
          físicas para jugar.
        </li>
      </ul>

      <h2>{c.fijosWeb ? 8 : 7}. Cambios en estos términos</h2>
      <p>
        Estos términos pueden actualizarse. La versión vigente es la publicada en esta página al momento de hacer tu reserva.
      </p>

      <h2>{c.fijosWeb ? 9 : 8}. Consultas</h2>
      <p>
        Para cualquier consulta sobre tu reserva, escribinos <Contacto c={c} motivo="Hola! Tengo una consulta sobre una reserva." />.
      </p>
    </LegalPage>
  );
}
