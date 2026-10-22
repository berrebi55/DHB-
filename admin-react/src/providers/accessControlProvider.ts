import type { AccessControlProvider } from "@refinedev/core";
import { profilCourant } from "./authProvider";

// Reflet, côté interface, des règles appliquées par la base (RLS) :
//  - admin : tout ;
//  - collaborateur : consulte et travaille au quotidien, mais ne supprime rien
//    et ne modifie ni les prix, ni les paramètres société, ni les utilisateurs.
// La base refuse de toute façon ces actions : l'interface évite simplement
// de proposer un bouton qui échouerait.
const RESERVE_ADMIN_EDITION = ["settings", "entreprise", "profiles"];

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = (await profilCourant())?.role;
    if (role === "admin") return { can: true };
    if (action === "delete") return { can: false, reason: "Suppression réservée aux administrateurs." };
    if (resource && RESERVE_ADMIN_EDITION.includes(resource) && action !== "list" && action !== "show") {
      return { can: false, reason: "Modification réservée aux administrateurs." };
    }
    return { can: true };
  },
  options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
};
