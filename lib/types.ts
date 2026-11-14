export type Tipo = 5 | 7 | 9 | 11;
export const TIPOS: Tipo[] = [5, 7, 9, 11];

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
  services: Service[];
  nightFrom: number; // minuto desde el que rige el precio de noche
  daysAhead: number;
  cancelHours: number;
  open: boolean; // reservas online habilitadas
  logoV: number;
  coverV: number;
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

export type Fijo = { id: string; courtId: string; dow: number; start: number; dur: number; name: string; phone: string; since: string };

/** Turno ya resuelto para un día (reserva o turno fijo) */
export type Booking = { id: string; courtId: string; start: number; dur: number; name: string; phone: string; origin: Origin; price: number };

export type LastBooking = { name: string; date: string; start: number; at: number };
