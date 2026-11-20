export type Tipo = 7 | 9 | 11;
export const TIPOS: Tipo[] = [7, 9, 11];

export type Court = {
  id: string;
  name: string;
  tipo: Tipo;
  detail: string; // ej: "Sintético · con luz"
  dur: number; // minutos por turno
  open: number; // minuto del día del primer turno
  close: number; // minuto del día en que termina el último turno (hasta 1440)
  priceDay: number; // 0 = no mostrar precio
  priceNight: number;
  shares: string[]; // canchas que usan el mismo espacio (si una está ocupada, la otra también)
  active: boolean;
};

export type Service = { title: string; text: string };
export type Photo = { id: string; caption: string; v: number };

/** Usuarios del panel: el dueño ve todo; el empleado solo los turnos y la caja de cada turno */
export type Role = "admin" | "staff";

// ---------- caja ----------
export type Product = { id: string; name: string; price: number; active: boolean };
/** Producto cargado en un turno. Guarda nombre y precio del momento, así un cambio de precios no altera lo ya cobrado. */
export type Item = { id: string; name: string; price: number; qty: number };
export type Player = { name: string; paid: boolean };
export type Caja = { items: Item[]; players: Player[]; drinksPaid: boolean; note: string };

export type Config = {
  name: string;
  slogan: string;
  description: string;
  address: string;
  mapsUrl: string;
  whatsapp: string;
  instagram: string;
  hours: string;
  notice: string; // cartel arriba de todo (vacío = no se muestra)
  bookingNote: string; // se muestra al confirmar la reserva
  legalName: string; // razón social o titular (páginas legales)
  cuit: string;
  email: string; // contacto para consultas y datos personales (opcional)
  services: Service[];
  nightFrom: number; // minuto desde el que rige el precio de noche
  daysAhead: number;
  cancelHours: number;
  open: boolean; // reservas online habilitadas
  logoV: number;
  coverV: number;
  photos: Photo[]; // fotos de las canchas que se ven en la web
};

export type Origin = "web" | "manual" | "bloqueo" | "fijo";

export type Reserva = {
  id: string;
  courtId: string;
  date: string;
  start: number;
  dur: number;
  name: string;
  phone: string;
  origin: Exclude<Origin, "fijo">;
  price: number;
  token: string;
  createdAt: number;
};

export type Fijo = { id: string; courtId: string; dow: number; start: number; dur: number; name: string; phone: string; since: string; items?: Item[] /* consumo habitual */ };

/** Turno ya resuelto para un día (reserva o turno fijo) */
export type Booking = { id: string; courtId: string; start: number; dur: number; name: string; phone: string; origin: Origin; price: number; habitual?: Item[] };

export type LastBooking = { name: string; date: string; start: number; at: number };
