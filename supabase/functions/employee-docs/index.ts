import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const ROOT_FOLDER = "1hc6tCluhJArvbiUMModaxiDWGB2Gw1Lz";
const GW = "https://connector-gateway.lovable.dev/google_drive";
const TYPES = ["national_id", "birth_certificate", "qualification", "driving_license", "other"] as const;
const MAX = 420 * 1024;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload"), employee_id: z.string().uuid(), type: z.enum(TYPES), file_name: z.string().min(1).max(200), mime: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]), data: z.string().min(1) }),
  z.object({ action: z.literal("view"), id: z.string().uuid() }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);

function gwHeaders(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": Deno.env.get("GOOGLE_DRIVE_API_KEY")!, ...extra };
}
async function drive(path: string, init: RequestInit = {}) {
  const r = await fetch(`${GW}${path}`, { ...init, headers: gwHeaders(init.headers as Record<string, string>) });
  if (!r.ok && r.status !== 404) { const t = await r.text(); throw new Error(`Drive [${r.status}]: ${t}`); }
  return r;
}
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function bytesToB64(b: Uint8Array) { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); }

async function employeeFolder(code: string, name: string) {
  const title = `${code} - ${name}`.replace(/'/g, "");
  const q = encodeURIComponent(`'${ROOT_FOLDER}' in parents and name='${title}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await (await drive(`/drive/v3/files?q=${q}&fields=files(id)`)).json();
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const created = await (await drive(`/drive/v3/files?fields=id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.folder", parents: [ROOT_FOLDER] }) })).json();
  return created.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles || []).some((r) => r.role === "admin" || r.role === "hr")) return json({ error: "forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const b = parsed.data;

    if (b.action === "upload") {
      const bytes = b64ToBytes(b.data);
      if (bytes.length > MAX) return json({ error: "file_too_large" }, 413);
      const { data: emp } = await admin.from("employees").select("employee_code,name_ar").eq("id", b.employee_id).single();
      if (!emp) return json({ error: "employee_not_found" }, 404);
      const folder = await employeeFolder(emp.employee_code, emp.name_ar);
      const boundary = "b" + crypto.randomUUID();
      const meta = JSON.stringify({ name: b.file_name, parents: [folder] });
      const enc = new TextEncoder();
      const head = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${b.mime}\r\n\r\n`);
      const tail = enc.encode(`\r\n--${boundary}--`);
      const body = new Uint8Array(head.length + bytes.length + tail.length);
      body.set(head); body.set(bytes, head.length); body.set(tail, head.length + bytes.length);
      const up = await (await drive(`/upload/drive/v3/files?uploadType=multipart&fields=id`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body })).json();

      const { data: old } = await admin.from("employee_documents").select("id,drive_file_id").eq("employee_id", b.employee_id).eq("type", b.type).maybeSingle();
      const row = { employee_id: b.employee_id, type: b.type, name: b.file_name, drive_file_id: up.id, mime_type: b.mime, size_bytes: bytes.length, file_url: `https://drive.google.com/file/d/${up.id}/view`, uploaded_at: new Date().toISOString() };
      const { error } = old ? await admin.from("employee_documents").update(row).eq("id", old.id) : await admin.from("employee_documents").insert(row);
      if (error) { await drive(`/drive/v3/files/${up.id}`, { method: "DELETE" }); throw error; }
      if (old?.drive_file_id) await drive(`/drive/v3/files/${old.drive_file_id}`, { method: "DELETE" });
      return json({ ok: true });
    }

    const { data: doc } = await admin.from("employee_documents").select("*").eq("id", b.id).maybeSingle();
    if (!doc) return json({ error: "not_found" }, 404);
    if (b.action === "delete") {
      if (doc.drive_file_id) await drive(`/drive/v3/files/${doc.drive_file_id}`, { method: "DELETE" });
      await admin.from("employee_documents").delete().eq("id", doc.id);
      return json({ ok: true });
    }
    const r = await drive(`/drive/v3/files/${doc.drive_file_id}?alt=media`);
    if (r.status === 404) return json({ error: "drive_file_missing" }, 404);
    return json({ mime: doc.mime_type, name: doc.name, data: bytesToB64(new Uint8Array(await r.arrayBuffer())) });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
