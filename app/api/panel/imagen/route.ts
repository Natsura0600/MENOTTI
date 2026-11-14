import { denied, fail, handle, ok } from "@/lib/api";
import { deleteImage, getSite, saveConfig, saveImage } from "@/lib/data";

/** Sube (o quita, con dataUrl vacío) el logo o la foto de portada */
export async function POST(req: Request) {
  try {
    const no = await denied();
    if (no) return no;
    const b = await req.json().catch(() => ({}));
    const kind = b.kind === "logo" || b.kind === "cover" ? b.kind : null;
    if (!kind) return fail("Imagen inválida.");
    const dataUrl = String(b.dataUrl ?? "");
    const { config } = await getSite();
    const key = kind === "logo" ? "logoV" : "coverV";
    if (!dataUrl) {
      await deleteImage(kind);
      config[key] = 0;
    } else {
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) return fail("Tiene que ser una imagen JPG o PNG.");
      if (dataUrl.length > 700_000) return fail("La imagen es muy pesada. Probá con otra.");
      await saveImage(kind, dataUrl);
      config[key] = Date.now();
    }
    await saveConfig(config);
    return ok({ config });
  } catch (e) {
    return handle(e);
  }
}
