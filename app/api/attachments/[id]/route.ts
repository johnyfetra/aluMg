import { z } from "zod";
import { fail, isResponse, requireRole } from "@/lib/api";
import { getAttachment, isImageMime } from "@/lib/chat";

// Pièce jointe d'un message : réservée aux deux participants. Les photos s'affichent dans la page, le reste se télécharge.
export async function GET(req: Request, { params }: RouteContext<"/api/attachments/[id]">) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const f = z.uuid().safeParse(id).success ? await getAttachment(user.id, id) : null;
  if (!f) return fail(404, "not_found");
  const download = new URL(req.url).searchParams.has("download") || !isImageMime(f.mime);
  return new Response(new Uint8Array(f.bytes), {
    headers: {
      "Content-Type": f.mime,
      "Content-Length": String(f.bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
