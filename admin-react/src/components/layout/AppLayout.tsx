import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, Drawer, Dropdown, Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  CustomerServiceOutlined,
  DownOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SafetyOutlined,
  SearchOutlined,
  SyncOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLogout } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { useIdentite, useIsMobile } from "../../lib/hooks";
import { initiales } from "../../lib/format";
import { NAV, activeKey, type BadgeKey } from "./nav";
import { GlobalSearch } from "./GlobalSearch";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { ListSkeleton } from "../ui";

const LS_KEY = "dhb-sider-collapsed";

function useBadges(pathname: string) {
  const [b, setB] = useState<Record<BadgeKey, number> & { urgents: number }>({ leads: 0, questions: 0, tickets: 0, urgents: 0 });
  const charger = useCallback(async () => {
    // -1 = compteur indisponible (erreur) : ne pas afficher « rien en attente » à tort.
    const c = (q: PromiseLike<{ count: number | null; error: unknown }>) =>
      Promise.resolve(q).then((r) => (r.error ? -1 : r.count ?? 0), () => -1);
    const [leads, questions, tickets, urgents] = await Promise.all([
      c(supabaseClient.from("leads").select("id", { count: "exact", head: true }).eq("status", "nouveau").neq("type", "question")),
      c(supabaseClient.from("leads").select("id", { count: "exact", head: true }).eq("status", "nouveau").eq("type", "question")),
      c(supabaseClient.from("tickets").select("id", { count: "exact", head: true }).in("status", ["ouvert", "en_cours"])),
      c(supabaseClient.from("tickets").select("id", { count: "exact", head: true }).in("status", ["ouvert", "en_cours"]).eq("priorite", "urgente")),
    ]);
    setB({ leads, questions, tickets, urgents });
  }, []);
  useEffect(() => {
    charger();
  }, [pathname, charger]);
  useEffect(() => {
    const t = setInterval(charger, 60_000);
    return () => clearInterval(t);
  }, [charger]);
  return b;
}

function SideMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const badges = useBadges(pathname);

  const items: MenuProps["items"] = NAV.map((g, gi) => {
    const children = g.items.map((it) => {
      const n = it.badge ? badges[it.badge] : 0;
      const danger = it.badge === "tickets" && badges.urgents > 0;
      return {
        key: it.key,
        icon: it.icon,
        label: (
          <>
            <span>{it.label}</span>
            {n > 0 && !collapsed && (
              <span className={`nav-badge${danger ? " danger" : ""}`} aria-label={`${n} en attente`}>{n}</span>
            )}
            {n < 0 && !collapsed && (
              <span className="nav-badge inconnu" title="Compteur indisponible" aria-label="compteur indisponible">?</span>
            )}
          </>
        ),
        onClick: () => {
          navigate(it.path);
          onNavigate?.();
        },
      };
    });
    if (!g.title) return { type: "group" as const, key: `g${gi}`, children };
    return { type: "group" as const, key: `g${gi}`, label: collapsed ? null : g.title, children };
  });

  return <Menu mode="inline" inlineCollapsed={collapsed} selectedKeys={[activeKey(pathname)]} items={items} />;
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">DHB</div>
      {!collapsed && (
        <div className="brand-text">
          <div className="brand-name">DHB</div>
          <div className="brand-sub">Back-office</div>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: user } = useIdentite();
  const { mutate: logout } = useLogout();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
    } catch {
      /* stockage indisponible : sans conséquence */
    }
  }, [collapsed]);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const createItems: MenuProps["items"] = [
    { key: "lead", icon: <InboxOutlined />, label: "Demande", onClick: () => navigate("/leads?creer=1") },
    { key: "client", icon: <TeamOutlined />, label: "Client", onClick: () => navigate("/clients?creer=1") },
    { key: "devis", icon: <FileTextOutlined />, label: "Devis", onClick: () => navigate("/devis/nouveau") },
    { key: "facture", icon: <FileDoneOutlined />, label: "Facture", onClick: () => navigate("/factures/nouvelle") },
    { key: "abo", icon: <SyncOutlined />, label: "Abonnement", onClick: () => navigate("/abonnements?creer=1") },
    { key: "ticket", icon: <CustomerServiceOutlined />, label: "Ticket", onClick: () => navigate("/tickets?creer=1") },
  ];

  const roleLabel = user?.role === "admin" ? "Administrateur" : user?.role ? "Collaborateur" : "";
  const userItems: MenuProps["items"] = [
    { key: "who", label: <div style={{ lineHeight: 1.3 }}><b>{user?.name}</b><div className="faint" style={{ fontSize: 12 }}>{roleLabel}</div></div>, disabled: true },
    { type: "divider" },
    { key: "secu", icon: <SafetyOutlined />, label: "Mon compte & sécurité", onClick: () => navigate("/systeme/securite") },
    { key: "logout", icon: <LogoutOutlined />, label: "Se déconnecter", danger: true, onClick: () => logout() },
  ];

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      {!isMobile && (
        <aside className={`app-sider${collapsed ? " collapsed" : ""}`} aria-label="Navigation principale">
          <Brand collapsed={collapsed} />
          <div className="sider-scroll">
            <SideMenu collapsed={collapsed} />
          </div>
          <div className="sider-footer">
            <Tooltip title={collapsed ? "Déplier le menu" : ""} placement="right">
              <Button type="text" block icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((c) => !c)} style={{ justifyContent: collapsed ? "center" : "flex-start", color: "#5b6576" }}>
                {!collapsed && "Réduire le menu"}
              </Button>
            </Tooltip>
          </div>
        </aside>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" width={280} closable={false}
        styles={{ body: { padding: 0 } }}>
        <Brand />
        <div style={{ paddingTop: 8 }}>
          <SideMenu collapsed={false} onNavigate={() => setDrawer(false)} />
        </div>
      </Drawer>

      <div className="app-main">
        <header className="app-header">
          {isMobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" />}
          <button type="button" className="header-search" onClick={() => setSearch(true)} aria-label="Rechercher">
            <SearchOutlined />
            <span>{isMobile ? "Rechercher…" : "Rechercher un client, un devis, une facture…"}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="header-actions">
            <Dropdown menu={{ items: createItems }} trigger={["click"]} placement="bottomRight">
              <Button type="primary" icon={<PlusOutlined />}>
                {!isMobile && <>Créer <DownOutlined style={{ fontSize: 10 }} /></>}
              </Button>
            </Dropdown>
            <Dropdown menu={{ items: userItems }} trigger={["click"]} placement="bottomRight">
              <div className="user-chip" role="button" tabIndex={0} aria-label="Menu utilisateur">
                <Avatar size={32} style={{ background: "#EEF3FF", color: "#1D40AB", fontWeight: 600, fontSize: 13 }}>
                  {initiales(user?.name)}
                </Avatar>
                {!isMobile && (
                  <div className="who">
                    <b>{user?.name ?? "…"}</b>
                    <span>{roleLabel}</span>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </header>
        <main className="app-content" id="contenu">
          {/* Une page en erreur n'emporte ni le menu ni le reste de l'application. */}
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<div className="panel"><ListSkeleton /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
