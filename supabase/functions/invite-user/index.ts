// =====================================================================
//  DHB — Edge Function : inviter un utilisateur dans le back-office.
//  Réservé aux ADMINISTRATEURS. Seul moyen (avec la page Utilisateurs) de
//  donner accès au CRM : l'inscription publique est désactivée et tout compte
//  créé autrement reste « en_attente ».
//  - email inconnu : envoie l'invitation Supabase et attribue le rôle choisi ;
//  - compte existant (ex. « en_attente ») : lui attribue le rôle choisi.
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

    // Compte déjà existant : on valide son accès sans renvoyer d'invitation.
    const { data: existant } = await sb.from("profiles").select("id").eq("email", mail).maybeSingle();
    if (existant?.id) {
      const { error } = await sb.from("profiles").update({ role: r, ...(nom ? { nom } : {}) }).eq("id", existant.id);
      if (error) throw new HttpError(400, error.message);
      return json({ ok: true, existant: true });
    }

    const { data, error } = await sb.auth.admin.inviteUserByEmail(mail, {
      redirectTo: Deno.env.get("ADMIN_URL") ?? undefined,
    });
    if (error) throw new HttpError(400, error.message);

    // Le trigger a créé le profil en « en_attente » : on applique le rôle choisi.
    const id = data.user?.id;
    if (!id) throw new HttpError(500, "invitation_incomplete");
    const { error: e2 } = await sb.from("profiles").upsert({ id, email: mail, role: r, nom: nom || null });
    if (e2) throw new HttpError(500, e2.message);
    return json({ ok: true });
  } catch (e) {
    return erreur(e);
  }
});
