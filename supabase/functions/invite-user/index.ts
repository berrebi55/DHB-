// =====================================================================
//  DHB — Edge Function : inviter un utilisateur dans le back-office.
//  Réservé aux ADMINISTRATEURS. Envoie l'email d'invitation Supabase et
//  attribue le rôle choisi (admin ou collaborateur).
//
//  Variables : ADMIN_URL (adresse du back-office, pour le lien d'invitation)
//  Appel (POST, jeton admin) : { "email": "…", "role": "collaborateur", "nom": "…" }
//  Déploiement : supabase functions deploy invite-user --no-verify-jwt
// =====================================================================
import { adminClient, cors, erreur, HttpError, json, requireUser } from "../_shared/securite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = adminClient();
    const appelant = await requireUser(req, sb);
    if (appelant.role !== "admin") throw new HttpError(403, "reserve_admin");

    const { email, role, nom } = await req.json().catch(() => ({}));
    const mail = String(email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new HttpError(400, "email_invalide");
    const r = role === "admin" ? "admin" : "collaborateur";

    const { data, error } = await sb.auth.admin.inviteUserByEmail(mail, {
      redirectTo: Deno.env.get("ADMIN_URL") ?? undefined,
    });
    if (error) throw new HttpError(400, error.message);

    const id = data.user?.id;
    if (id) {
      await sb.from("profiles").upsert({ id, email: mail, role: r, nom: nom || null });
    }
    return json({ ok: true });
  } catch (e) {
    return erreur(e);
  }
});
