import { getImage } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const data = kind === "logo" || kind === "cover" ? await getImage(kind) : null;
  const m = data ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(data) : null;
  if (!m) return new Response("No encontrada", { status: 404 });
  // La dirección lleva ?v=N, así que se puede guardar en caché para siempre
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" } });
}
