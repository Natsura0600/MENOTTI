import { denied, fail, handle, ok, str } from "@/lib/api";
import { deleteImage, getSiteFresh, newId, saveConfig, saveImage } from "@/lib/data";

const MAX_PHOTOS = 8;

/**
 * Sube (o quita, con dataUrl vacío) el logo, la foto de portada o una foto de las canchas.
 * kind: "logo" | "cover" | "foto". Para quitar una foto de cancha se manda su id.
 */
export async function POST(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const kind = b.kind === "logo" || b.kind === "cover" || b.kind === "foto" ? (b.kind as "logo" | "cover" | "foto") : null;
    if (!kind) return fail("Imagen inválida.");
    const dataUrl = String(b.dataUrl ?? "");
    if (dataUrl) {
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) return fail("Tiene que ser una imagen JPG o PNG.");
      if (dataUrl.length > 700_000) return fail("La imagen es muy pesada. Probá con otra.");
    }
    const { config } = await getSiteFresh();
    const photos = config.photos ?? [];

    if (kind === "foto") {
      if (!dataUrl) {
        const id = str(b.id, 40);
        await deleteImage(`foto_${id}`);
        config.photos = photos.filter((p) => p.id !== id);
      } else {
        if (photos.length >= MAX_PHOTOS) return fail(`Podés subir hasta ${MAX_PHOTOS} fotos. Quitá alguna primero.`);
        const id = newId("i").replace(/[^a-z0-9_]/g, "");
        await saveImage(`foto_${id}`, dataUrl);
        config.photos = [...photos, { id, caption: str(b.caption, 60), v: Date.now() }];
      }
    } else {
      const key = kind === "logo" ? "logoV" : "coverV";
      if (!dataUrl) {
        await deleteImage(kind);
        config[key] = 0;
      } else {
        await saveImage(kind, dataUrl);
        config[key] = Date.now();
      }
    }
    await saveConfig(config);
    return ok({ config });
  } catch (e) {
    return handle(e);
  }
}
