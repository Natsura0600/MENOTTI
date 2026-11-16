import { denied, fail, handle, int, ok, str } from "@/lib/api";
import { newId, saveProducts } from "@/lib/data";
import type { Product } from "@/lib/types";

/** Guarda la lista de productos de la caja (bebidas, etc.). Solo el dueño. */
export async function PUT(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    if (!Array.isArray(b.products) || b.products.length > 60) return fail("Lista de productos inválida.");
    const seen = new Set<string>();
    const products: Product[] = [];
    for (const p of b.products as Record<string, unknown>[]) {
      const name = str(p.name, 40);
      if (!name) continue;
      let id = str(p.id, 40);
      if (!id || seen.has(id)) id = newId("p");
      seen.add(id);
      products.push({ id, name, price: int(p.price, 0, 100000000, 0), active: p.active !== false });
    }
    await saveProducts(products);
    return ok({ products });
  } catch (e) {
    return handle(e);
  }
}
