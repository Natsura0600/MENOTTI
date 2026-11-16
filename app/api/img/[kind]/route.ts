import { getImage } from "@/lib/data";

/** Sirve el logo, la portada y las fotos de las canchas ("foto_<id>") */
export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const data = kind === "logo" || kind === "cover" || /^foto_[a-z0-9_]{3,40}$/.test(kind) ? await getImage(kind) : null;
  const m = data ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(data) : null;
  if (!m) return new Response("No encontrada", { status: 404 });
  // La dirección lleva ?v=N, así que se puede guardar para siempre: en el celular y en la red de Vercel.
  // Resultado: cada imagen se lee de la base una sola vez y después ya no gasta comandos ni ancho de banda de Upstash.
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" },
  });
}
