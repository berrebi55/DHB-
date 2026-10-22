import type { ReactNode } from "react";
import { Button, Spin } from "antd";
import { ClockCircleOutlined, LogoutOutlined, ReloadOutlined } from "@ant-design/icons";
import { useLogout } from "@refinedev/core";
import { useIdentite } from "../../lib/hooks";
import { estEquipe, viderCacheProfil } from "../../providers/authProvider";

/**
 * Le back-office n'est affiché qu'aux membres de l'équipe (admin, collaborateur).
 * Un compte connecté mais non validé (« en_attente ») voit uniquement cet écran.
 * La base refuse de toute façon ses requêtes (RLS) : l'écran évite une
 * interface vide et explique quoi faire.
 */
export function ExigerEquipe({ children }: { children: ReactNode }) {
  const { data: identite, isLoading, refetch } = useIdentite();
  const { mutate: logout } = useLogout();

  if (isLoading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Spin /></div>;
  }
  if (estEquipe(identite?.role)) return <>{children}</>;

  return (
    <main className="login-main" style={{ minHeight: "100vh" }}>
      <div className="login-card" role="alert">
        <div className="empty" style={{ padding: "8px 0" }}>
          <div className="ico"><ClockCircleOutlined /></div>
          <h1 style={{ fontSize: 20, margin: "4px 0 6px" }}>Accès en attente de validation</h1>
          <p>
            Votre compte{identite?.email ? <> (<b>{identite.email}</b>)</> : null} est bien créé, mais un
            administrateur doit encore vous donner accès au back-office.
          </p>
          <p className="muted">Une fois votre accès validé, cliquez sur « Vérifier à nouveau ».</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => { viderCacheProfil(); void refetch(); }}>
              Vérifier à nouveau
            </Button>
            <Button icon={<LogoutOutlined />} onClick={() => logout()}>Se déconnecter</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
