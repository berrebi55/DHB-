import { Authenticated, Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router-v6";
import { Outlet, Route, Routes } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import "./styles.css";

import { supabaseClient } from "./supabaseClient";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { themeConfig } from "./theme";
import { AppLayout } from "./components/layout/AppLayout";

import { LoginPage } from "./pages/login";
import { NotFound } from "./pages/NotFound";
import { DashboardPage } from "./pages/dashboard";
import { LeadsList } from "./pages/leads/list";
import { LeadShow } from "./pages/leads/show";
import { ClientsList } from "./pages/clients/list";
import { ClientShow } from "./pages/clients/show";
import { DevisList } from "./pages/devis/list";
import { DevisShow } from "./pages/devis/show";
import { DocumentEditor } from "./pages/documents/DocumentEditor";
import { PrestationsList } from "./pages/prestations";
import { FacturesList } from "./pages/factures/list";
import { FactureShow } from "./pages/factures/show";
import { PaiementsList } from "./pages/paiements";
import { AbonnementsList } from "./pages/abonnements";
import { TicketsList } from "./pages/tickets/list";
import { TicketShow } from "./pages/tickets/show";
import { StatsOverview, StatsCA, StatsRecurrent, StatsCommercial } from "./pages/pilotage";
import { PrixPage } from "./pages/contenu/prix";
import { UtilisateursPage } from "./pages/systeme/utilisateurs";
import { ParametresPage } from "./pages/systeme/parametres";
import { SecuritePage } from "./pages/systeme/securite";
import { JournalPage } from "./pages/systeme/journal";

const RESOURCES = [
  "dashboard", "leads", "clients", "clients_vue", "devis", "prestations", "factures", "factures_vue",
  "paiements", "abonnements", "tickets", "notes", "activites", "profiles", "settings", "entreprise",
].map((name) => ({ name, list: name === "dashboard" ? "/" : undefined }));

export default function App() {
  return (
    <ConfigProvider theme={themeConfig} locale={frFR}>
      <AntdApp>
        <Refine
          dataProvider={dataProvider(supabaseClient)}
          liveProvider={liveProvider(supabaseClient)}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          routerProvider={routerProvider}
          notificationProvider={useNotificationProvider}
          resources={RESOURCES}
          options={{ syncWithLocation: false, warnWhenUnsavedChanges: false, liveMode: "off", disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } } } } }}
        >
          <Routes>
            <Route
              element={
                <Authenticated key="app" fallback={<CatchAllNavigate to="/login" />}>
                  <AppLayout />
                </Authenticated>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsList mode="devis" />} />
              <Route path="/leads/:id" element={<LeadShow />} />
              <Route path="/support/questions" element={<LeadsList mode="question" />} />
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/:id" element={<ClientShow />} />
              <Route path="/devis" element={<DevisList />} />
              <Route path="/devis/nouveau" element={<DocumentEditor kind="devis" />} />
              <Route path="/devis/:id" element={<DevisShow />} />
              <Route path="/devis/:id/modifier" element={<DocumentEditor kind="devis" />} />
              <Route path="/prestations" element={<PrestationsList />} />
              <Route path="/factures" element={<FacturesList />} />
              <Route path="/factures/nouvelle" element={<DocumentEditor kind="facture" />} />
              <Route path="/factures/:id" element={<FactureShow />} />
              <Route path="/factures/:id/modifier" element={<DocumentEditor kind="facture" />} />
              <Route path="/paiements" element={<PaiementsList />} />
              <Route path="/abonnements" element={<AbonnementsList />} />
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/tickets/:id" element={<TicketShow />} />
              <Route path="/pilotage/statistiques" element={<StatsOverview />} />
              <Route path="/pilotage/chiffre-affaires" element={<StatsCA />} />
              <Route path="/pilotage/recurrent" element={<StatsRecurrent />} />
              <Route path="/pilotage/commercial" element={<StatsCommercial />} />
              <Route path="/contenu/prix" element={<PrixPage />} />
              <Route path="/systeme/utilisateurs" element={<UtilisateursPage />} />
              <Route path="/systeme/parametres" element={<ParametresPage />} />
              <Route path="/systeme/securite" element={<SecuritePage />} />
              <Route path="/systeme/journal" element={<JournalPage />} />
              <Route path="*" element={<NotFound />} />
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
