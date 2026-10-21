import { Refine, Authenticated } from "@refinedev/core";
import {
  ThemedLayoutV2,
  ErrorComponent,
  useNotificationProvider,
  RefineThemes,
  ThemedTitleV2,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { Routes, Route, Outlet } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import frFR from "antd/locale/fr_FR";
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
    <ConfigProvider theme={RefineThemes.Blue} locale={frFR}>
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
