import { lazy } from "react";
import { Authenticated, Refine } from "@refinedev/core";
import "antd/dist/reset.css";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router-v6";
import { Outlet, Route, Routes } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import "./styles.css";

import { supabaseClient } from "./supabaseClient";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { themeConfig } from "./theme";
import { queryClient } from "./queryClient";
import { AppLayout } from "./components/layout/AppLayout";
import { ExigerEquipe } from "./components/layout/ExigerEquipe";

import { LoginPage } from "./pages/login";

// Pages chargées à la demande : l'ouverture du back-office ne télécharge
// que le nécessaire (les graphiques, l'éditeur de documents… arrivent ensuite).
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));
const DashboardPage = lazy(() => import("./pages/dashboard").then((m) => ({ default: m.DashboardPage })));
const LeadsList = lazy(() => import("./pages/leads/list").then((m) => ({ default: m.LeadsList })));
const LeadShow = lazy(() => import("./pages/leads/show").then((m) => ({ default: m.LeadShow })));
const ClientsList = lazy(() => import("./pages/clients/list").then((m) => ({ default: m.ClientsList })));
const ClientShow = lazy(() => import("./pages/clients/show").then((m) => ({ default: m.ClientShow })));
const DevisList = lazy(() => import("./pages/devis/list").then((m) => ({ default: m.DevisList })));
const DevisShow = lazy(() => import("./pages/devis/show").then((m) => ({ default: m.DevisShow })));
const DocumentEditor = lazy(() => import("./pages/documents/DocumentEditor").then((m) => ({ default: m.DocumentEditor })));
const PrestationsList = lazy(() => import("./pages/prestations").then((m) => ({ default: m.PrestationsList })));
const FacturesList = lazy(() => import("./pages/factures/list").then((m) => ({ default: m.FacturesList })));
const FactureShow = lazy(() => import("./pages/factures/show").then((m) => ({ default: m.FactureShow })));
const PaiementsList = lazy(() => import("./pages/paiements").then((m) => ({ default: m.PaiementsList })));
const AbonnementsList = lazy(() => import("./pages/abonnements").then((m) => ({ default: m.AbonnementsList })));
const TicketsList = lazy(() => import("./pages/tickets/list").then((m) => ({ default: m.TicketsList })));
const TicketShow = lazy(() => import("./pages/tickets/show").then((m) => ({ default: m.TicketShow })));
const StatsOverview = lazy(() => import("./pages/pilotage").then((m) => ({ default: m.StatsOverview })));
const StatsCA = lazy(() => import("./pages/pilotage").then((m) => ({ default: m.StatsCA })));
const StatsRecurrent = lazy(() => import("./pages/pilotage").then((m) => ({ default: m.StatsRecurrent })));
const StatsCommercial = lazy(() => import("./pages/pilotage").then((m) => ({ default: m.StatsCommercial })));
const PrixPage = lazy(() => import("./pages/contenu/prix").then((m) => ({ default: m.PrixPage })));
const UtilisateursPage = lazy(() => import("./pages/systeme/utilisateurs").then((m) => ({ default: m.UtilisateursPage })));
const ParametresPage = lazy(() => import("./pages/systeme/parametres").then((m) => ({ default: m.ParametresPage })));
const SecuritePage = lazy(() => import("./pages/systeme/securite").then((m) => ({ default: m.SecuritePage })));
const SauvegardesPage = lazy(() => import("./pages/systeme/sauvegardes").then((m) => ({ default: m.SauvegardesPage })));
const JournalPage = lazy(() => import("./pages/systeme/journal").then((m) => ({ default: m.JournalPage })));

const RESOURCES = [
  "dashboard", "leads", "clients", "clients_vue", "devis", "prestations", "factures", "factures_vue",
  "paiements", "abonnements", "tickets", "notes", "activites", "profiles", "settings", "entreprise", "sauvegardes",
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
          notificationProvider={notificationProvider}
          resources={RESOURCES}
          options={{ syncWithLocation: false, warnWhenUnsavedChanges: false, liveMode: "off", disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
        >
          <Routes>
            <Route
              element={
                <Authenticated key="app" fallback={<CatchAllNavigate to="/login" />}>
                  <ExigerEquipe>
                    <AppLayout />
                  </ExigerEquipe>
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
              <Route path="/systeme/sauvegardes" element={<SauvegardesPage />} />
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
