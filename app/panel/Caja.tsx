"use client";
import { useState } from "react";
import type { Booking, Caja, Court, Item, Player, Product } from "@/lib/types";
import { api, errMsg, money } from "@/lib/util";

export const EMPTY_CAJA: Caja = { items: [], players: [], drinksPaid: false, note: "" };

/** Caja de un turno. Un turno fijo sin nada cargado ese día arranca con su consumo habitual. */
export function cajaOf(b: Booking, map: Record<string, Caja>): Caja {
  return map[b.id] ?? (b.habitual?.length ? { ...EMPTY_CAJA, items: b.habitual } : EMPTY_CAJA);
}

/** Cuántas unidades de una bebida están pagas (las cajas viejas solo tenían la casilla "bebidas pagadas") */
export const paidOf = (i: Item, c: Pick<Caja, "drinksPaid">) => Math.min(i.qty, i.paid ?? (c.drinksPaid ? i.qty : 0));

/** Cuentas de un turno: la cancha se reparte entre los jugadores cargados; cada bebida se cobra por separado */
export function totals(price: number, c: Caja) {
  const drinks = c.items.reduce((s, i) => s + i.price * i.qty, 0);
  const drinksPaidAmt = c.items.reduce((s, i) => s + i.price * paidOf(i, c), 0);
  const owedUnits = c.items.reduce((s, i) => s + (i.qty - paidOf(i, c)), 0);
  const n = c.players.length;
  const paidN = c.players.filter((p) => p.paid).length;
  const courtPaid = n ? Math.round((price * paidN) / n) : 0;
  const cobrado = courtPaid + drinksPaidAmt;
  const total = price + drinks;
  return { drinks, drinksPaidAmt, owedUnits, total, cobrado, falta: Math.max(0, total - cobrado), n, paidN, units: c.items.reduce((s, i) => s + i.qty, 0) };
}

/** Bebidas y pagos dentro de un turno (lo usan el dueño y el empleado) */
export function TurnoCaja({ b, court, date, initial, saved, products, onSaved }: { b: Booking; court: Court; date: string; initial: Caja; saved: boolean; products: Product[]; onSaved: (c: Caja, msg: string) => void }) {
  // por cada bebida: cuántas se pagaron y cuántas se deben
  const [pagas, setPagas] = useState<Record<string, number>>(() => Object.fromEntries(initial.items.map((i) => [i.id, paidOf(i, initial)])));
  const [deben, setDeben] = useState<Record<string, number>>(() => Object.fromEntries(initial.items.map((i) => [i.id, i.qty - paidOf(i, initial)])));
  const [players, setPlayers] = useState<Player[]>(initial.players);
  const [note, setNote] = useState(initial.note);
  const [dirty, setDirty] = useState(!saved && initial.items.length > 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // productos activos + lo que ya estaba cargado aunque después se haya sacado de la lista
  const rows: { id: string; name: string; price: number }[] = [
    ...initial.items.filter((i) => !products.some((p) => p.id === i.id && p.active)),
    ...products.filter((p) => p.active).map((p) => {
      const old = initial.items.find((i) => i.id === p.id);
      return { id: p.id, name: old?.name ?? p.name, price: old?.price ?? p.price };
    }),
  ];
  const qtyOf = (id: string) => (pagas[id] ?? 0) + (deben[id] ?? 0);
  const items: Item[] = rows.filter((r) => qtyOf(r.id) > 0).map((r) => ({ ...r, qty: qtyOf(r.id), paid: pagas[r.id] ?? 0 }));
  const drinksPaid = items.length > 0 && items.every((i) => i.paid === i.qty);
  const t = totals(b.price, { items, players, drinksPaid, note });
  const perHead = t.n ? Math.round(b.price / t.n) : 0;
  const touch = () => setDirty(true);

  const bump = (set: typeof setPagas, id: string, d: number) => {
    set((q) => ({ ...q, [id]: Math.max(0, Math.min(999, (q[id] ?? 0) + d)) }));
    touch();
  };
  /** Pasa a "pagó" todo lo que se debía */
  const payAll = () => {
    setPagas((p) => Object.fromEntries(rows.map((r) => [r.id, (p[r.id] ?? 0) + (deben[r.id] ?? 0)])));
    setDeben({});
    touch();
  };
  const setN = (n: number) => {
    n = Math.max(0, Math.min(30, n));
    setPlayers((p) => {
      const k = Math.min(n, p.filter((x) => x.paid).length);
      return Array.from({ length: n }, (_, i) => ({ name: "", paid: i < k }));
    });
    touch();
  };
  /** Sin nombres: solo se anota cuántos pagaron */
  const setPaid = (k: number) => {
    k = Math.max(0, Math.min(players.length, k));
    setPlayers((all) => all.map((_, i) => ({ name: "", paid: i < k })));
    touch();
  };

  async function save(habitual = false) {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ caja: Caja }>("/api/panel/caja", "PUT", { date, id: b.id, items: items.map(({ id, qty, paid }) => ({ id, qty, paid })), players, note, habitual });
      setDirty(false);
      onSaved(r.caja, habitual ? "Guardado. Estas bebidas se cargan solas todas las semanas ✓" : "Caja guardada ✓");
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  return (
    <div className="caja">
      {err && <div className="err">{err}</div>}

      <h4>Bebidas y consumos</h4>
      {rows.length === 0 ? (
        <p className="mut small">Todavía no hay productos cargados. El dueño los agrega en la pestaña Caja.</p>
      ) : (
        <div className="prods">
          {rows.map((r) => {
            const pg = pagas[r.id] ?? 0;
            const db = deben[r.id] ?? 0;
            return (
              <div className="prod2" key={r.id}>
                <div className="prod2-h">
                  <b>{r.name}</b>
                  {r.price > 0 && <small className="mut"> {money(r.price)}</small>}
                  {pg + db > 0 && <small className="mut"> · {pg + db} en total</small>}
                </div>
                <div className="prod2-c">
                  <div className={"cnt" + (pg ? " pg" : "")}>
                    <span>Pagó</span>
                    <button type="button" className="qb" onClick={() => bump(setPagas, r.id, -1)} disabled={!pg} aria-label={`Una ${r.name} pagada menos`}>−</button>
                    <span className="qn">{pg}</span>
                    <button type="button" className="qb" onClick={() => bump(setPagas, r.id, 1)} aria-label={`Agregar ${r.name} pagada`}>+</button>
                  </div>
                  <div className={"cnt" + (db ? " db" : "")}>
                    <span>Debe</span>
                    <button type="button" className="qb" onClick={() => bump(setDeben, r.id, -1)} disabled={!db} aria-label={`Una ${r.name} sin pagar menos`}>−</button>
                    <span className="qn">{db}</span>
                    <button type="button" className="qb" onClick={() => bump(setDeben, r.id, 1)} aria-label={`Agregar ${r.name} sin pagar`}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {t.owedUnits > 0 && (
        <button type="button" className="btn sm ghost full" style={{ marginTop: 10 }} onClick={payAll}>
          Ya pagaron todas las bebidas ({money(t.drinks - t.drinksPaidAmt)})
        </button>
      )}

      <h4 style={{ marginTop: 18 }}>¿Cuántos pagaron la cancha?</h4>
      {players.length === 0 ? (
        <button type="button" className="btn sm dark full" onClick={() => setN(court.tipo * 2)}>Anotar pagos ({court.tipo * 2} jugadores)</button>
      ) : (
        <>
          <div className="payrow">
            <button type="button" className="qb" onClick={() => setPaid(t.paidN - 1)} disabled={t.paidN === 0} aria-label="Uno menos pagó">−</button>
            <div className="paynum">
              <b>{t.paidN}</b> de {t.n} pagaron
              {perHead > 0 && <small className="mut">{money(perHead)} cada uno</small>}
            </div>
            <button type="button" className="qb" onClick={() => setPaid(t.paidN + 1)} disabled={t.paidN >= t.n} aria-label="Uno más pagó">+</button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn sm ghost grow" onClick={() => setPaid(t.paidN === t.n ? 0 : t.n)}>{t.paidN === t.n ? "Nadie pagó" : "Pagaron todos"}</button>
            <span className="row" style={{ gap: 6 }}>
              <span className="mut small">Jugadores</span>
              <button type="button" className="qb sm" onClick={() => setN(players.length - 1)} aria-label="Un jugador menos">−</button>
              <button type="button" className="qb sm" onClick={() => setN(players.length + 1)} aria-label="Un jugador más">+</button>
            </span>
          </div>
        </>
      )}

      <div className="field" style={{ marginTop: 14 }}>
        <input type="text" value={note} maxLength={200} placeholder="Nota (opcional). Ej: falta que pague Juan" onChange={(e) => { setNote(e.target.value); touch(); }} />
      </div>

      <div className="tot">
        {b.price > 0 && <div><span>Cancha</span><b>{money(b.price)}</b></div>}
        {t.drinks > 0 && <div><span>Bebidas ({t.units})</span><b>{money(t.drinks)}</b></div>}
        {t.owedUnits > 0 && <div className="sub"><span>· deben {t.owedUnits} {t.owedUnits === 1 ? "bebida" : "bebidas"}</span><b style={{ color: "var(--amber)" }}>{money(t.drinks - t.drinksPaidAmt)}</b></div>}
        {t.total > 0 && <div className="big"><span>Total</span><b>{money(t.total)}</b></div>}
        {t.total > 0 && <div><span>Cobrado{t.n ? ` · pagaron ${t.paidN} de ${t.n}` : ""}</span><b style={{ color: "var(--g)" }}>{money(t.cobrado)}</b></div>}
        {t.falta > 0 && <div><span>Falta cobrar</span><b style={{ color: "var(--amber)" }}>{money(t.falta)}</b></div>}
      </div>

      <button type="button" className="btn full" disabled={busy || !dirty} onClick={() => save(false)}>{busy ? "Guardando…" : dirty ? "Guardar caja" : "Caja guardada ✓"}</button>
      {b.origin === "fijo" && (
        <button type="button" className="btn sm ghost full" style={{ marginTop: 8 }} disabled={busy} onClick={() => save(true)}>
          {items.length ? "Cargar estas bebidas todas las semanas" : "Quitar el consumo de todas las semanas"}
        </button>
      )}
      {b.origin === "fijo" && !!b.habitual?.length && <p className="hint">Consumo habitual de este turno fijo: {b.habitual.map((i) => `${i.qty} ${i.name}`).join(", ")}.</p>}
    </div>
  );
}

/** Pestaña Caja (solo el dueño): la lista de productos con precio */
export function Productos({ products: initial, onSaved }: { products: Product[]; onSaved: (p: Product[]) => void }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const upd = (i: number, p: Partial<Product>) => setList(list.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ products: Product[] }>("/api/panel/productos", "PUT", { products: list });
      setList(r.products);
      onSaved(r.products);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p className="mut" style={{ marginBottom: 14 }}>
        Los productos que se pueden cargar en cada turno (bebidas, alquiler de pecheras, lo que quieras). Tocá un turno en la agenda para anotar cuántos llevaron y quién pagó.
      </p>
      <div className="card" style={{ marginBottom: 14 }}>
        {list.length === 0 && <p className="mut small" style={{ marginBottom: 12 }}>No hay productos. Agregá el primero.</p>}
        {list.map((p, i) => (
          <div className="prodedit" key={p.id || i} style={{ opacity: p.active ? 1 : 0.55 }}>
            <input type="text" value={p.name} placeholder="Nombre. Ej: Cerveza" maxLength={40} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Nombre del producto" />
            <input type="number" inputMode="numeric" value={p.price || ""} placeholder="Precio" onChange={(e) => upd(i, { price: Number(e.target.value) })} aria-label="Precio" />
            <label className="switch" style={{ fontWeight: 400, fontSize: 14 }}>
              <input type="checkbox" checked={p.active} onChange={(e) => upd(i, { active: e.target.checked })} /> Se vende
            </label>
            <button type="button" className="btn sm danger" onClick={() => setList(list.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        ))}
        <button type="button" className="btn sm ghost" onClick={() => setList([...list, { id: "", name: "", price: 0, active: true }])}>+ Agregar producto</button>
        <p className="hint">Si cambiás un precio, lo que ya estaba cargado en turnos anteriores queda con el precio viejo.</p>
      </div>
      <div className="savebar">
        {err && <div className="err">{err}</div>}
        <button type="button" className="btn big" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar productos"}</button>
      </div>
    </div>
  );
}
