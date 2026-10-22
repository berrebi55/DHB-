import { Refine, Authenticated } from "@refinedev/core";
import {
  ThemedLayoutV2,
  ErrorComponent,
  useNotificationProvider,
  ThemedTitleV2,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import "./styles.css";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { Routes, Route, Outlet } from "react-router-dom";
import { ConfigProvider, App as AntdApp, theme as antdTheme } from "antd";
import frFR from "antd/locale/fr_FR";

// Thème « cyber sombre néon » — accents cyan + violet, surfaces en verre sombre.
const CYBER_THEME = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#22d3ee",
    colorInfo: "#22d3ee",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorError: "#fb7185",
    colorBgBase: "#0a0f1e",
    colorBgContainer: "rgba(18,26,46,0.72)",
    colorBgElevated: "#111a30",
    colorBorder: "rgba(120,160,255,0.16)",
    colorBorderSecondary: "rgba(120,160,255,0.10)",
    colorText: "#e6eefb",
    colorTextSecondary: "#9fb3d1",
    borderRadius: 12,
    fontFamily:
      "'Space Grotesk','IBM Plex Sans',system-ui,-apple-system,sans-serif",
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: "rgba(10,15,30,0.85)",
      siderBg: "rgba(10,15,30,0.92)",
      bodyBg: "transparent",
      triggerBg: "rgba(18,26,46,0.9)",
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "rgba(34,211,238,0.14)",
      itemSelectedColor: "#22d3ee",
      itemHoverColor: "#22d3ee",
    },
    Card: { colorBgContainer: "rgba(18,26,46,0.72)" },
    Table: { headerBg: "rgba(34,211,238,0.07)", rowHoverBg: "rgba(34,211,238,0.06)" },
    Statistic: { contentFontSize: 28 },
  },
};
import {
  DashboardOutlined,
  InboxOutlined,
  TeamOutlined,
  FileTextOutlined,
  EuroOutlined,
  SyncOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { supabaseClient } from "./supabaseClient";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";

import { DashboardPage } from "./pages/dashboard";
import { LoginPage } from "./pages/login";
import { LeadsList } from "./pages/leads/list";
import { ClientsList } from "./pages/clients/list";
import { ClientCreate } from "./pages/clients/create";
import { ClientEdit } from "./pages/clients/edit";
import { DevisList } from "./pages/devis/list";
import { DevisCreate } from "./pages/devis/create";
import { DevisEdit } from "./pages/devis/edit";
import { FacturesList } from "./pages/factures/list";
import { FactureCreate } from "./pages/factures/create";
import { AbonnementsList } from "./pages/abonnements/list";
import { AbonnementCreate } from "./pages/abonnements/create";
import { TicketsList } from "./pages/tickets/list";
import { SettingsPage } from "./pages/settings";

export default function App() {
  return (
    <ConfigProvider theme={CYBER_THEME} locale={frFR}>
      <AntdApp>
        <Refine
          dataProvider={dataProvider(supabaseClient)}
          liveProvider={liveProvider(supabaseClient)}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          routerProvider={routerProvider}
          notificationProvider={useNotificationProvider}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            liveMode: "auto",
            disableTelemetry: true,
          }}
          resources={[
            {
              name: "dashboard",
              list: "/",
              meta: { label: "Tableau de bord", icon: <DashboardOutlined /> },
            },
            {
              name: "leads",
              list: "/leads",
              meta: { label: "Demandes", icon: <InboxOutlined /> },
            },
            {
              name: "clients",
              list: "/clients",
              create: "/clients/create",
              edit: "/clients/edit/:id",
              meta: { label: "Clients", icon: <TeamOutlined />, canDelete: true },
            },
            {
              name: "devis",
              list: "/devis",
              create: "/devis/create",
              edit: "/devis/edit/:id",
              meta: { label: "Devis", icon: <FileTextOutlined />, canDelete: true },
            },
            {
              name: "factures",
              list: "/factures",
              create: "/factures/create",
              meta: { label: "Factures", icon: <EuroOutlined />, canDelete: true },
            },
            {
              name: "abonnements",
              list: "/abonnements",
              create: "/abonnements/create",
              meta: { label: "Abonnements", icon: <SyncOutlined />, canDelete: true },
            },
            {
              name: "tickets",
              list: "/tickets",
              meta: { label: "Tickets", icon: <CustomerServiceOutlined /> },
            },
            {
              name: "settings",
              list: "/settings",
              meta: { label: "Paramètres", icon: <SettingOutlined /> },
            },
          ]}
        >
          <Routes>
            <Route
              element={
                <Authenticated key="auth" fallback={<CatchAllNavigate to="/login" />}>
                  <ThemedLayoutV2
                    Title={({ collapsed }) => (
                      <ThemedTitleV2 collapsed={collapsed} text="DHB Admin" />
                    )}
                  >
                    <Outlet />
                  </ThemedLayoutV2>
                </Authenticated>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsList />} />
              <Route path="/clients">
                <Route index element={<ClientsList />} />
                <Route path="create" element={<ClientCreate />} />
                <Route path="edit/:id" element={<ClientEdit />} />
              </Route>
              <Route path="/devis">
                <Route index element={<DevisList />} />
                <Route path="create" element={<DevisCreate />} />
                <Route path="edit/:id" element={<DevisEdit />} />
              </Route>
              <Route path="/factures">
                <Route index element={<FacturesList />} />
                <Route path="create" element={<FactureCreate />} />
              </Route>
              <Route path="/abonnements">
                <Route index element={<AbonnementsList />} />
                <Route path="create" element={<AbonnementCreate />} />
              </Route>
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<ErrorComponent />} />
            </Route>
            <Route
              element={
                <Authenticated key="login" fallback={<Outlet />}>
                  <NavigateToResource resource="dashboard" />
                </Authenticated>
              }
            >
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </Refine>
      </AntdApp>
    </ConfigProvider>
  );
}
