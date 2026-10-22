import { z } from "zod";
import { fail, isResponse, requireRole } from "@/lib/api";
import { isAudioMime, isImageMime } from "@/lib/attach";
import { getAttachment } from "@/lib/chat";

// Pièce jointe d'un message : réservée aux deux participants. Photos et vocaux s'affichent dans la page (les vocaux se lisent et se parcourent
// grâce aux requêtes par plages d'octets), le reste se télécharge.
export async function GET(req: Request, { params }: RouteContext<"/api/attachments/[id]">) {
  const user = await requireRole("client", "menuisier");
  if (isResponse(user)) return user;
  const { id } = await params;
  const f = z.uuid().safeParse(id).success ? await getAttachment(user.id, id) : null;
  if (!f) return fail(404, "not_found");
  const inline = (isImageMime(f.mime) || isAudioMime(f.mime)) && !new URL(req.url).searchParams.has("download");
  const headers: Record<string, string> = {
    "Content-Type": f.mime,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };
  const total = f.bytes.length;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    return new Response(new Uint8Array(f.bytes.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${total}` } });
  }
  return new Response(new Uint8Array(f.bytes), { headers: { ...headers, "Content-Length": String(total) } });
}
