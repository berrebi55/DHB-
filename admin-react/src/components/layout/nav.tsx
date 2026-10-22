import type { ReactNode } from "react";
import {
  AppstoreOutlined,
  AimOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  CustomerServiceOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  MailOutlined,
  FileSearchOutlined,
  InboxOutlined,
  LineChartOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  RiseOutlined,
  SafetyOutlined,
  SettingOutlined,
  SyncOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

export type BadgeKey = "leads" | "questions" | "tickets";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  badge?: BadgeKey;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Organisation du back-office (voir docs/REFONTE.md §2). Pour ajouter un écran :
// une entrée ici + une route dans App.tsx.
export const NAV: NavGroup[] = [
  { items: [{ key: "dashboard", label: "Tableau de bord", path: "/", icon: <HomeOutlined /> }] },
  {
    title: "Commercial",
    items: [
      { key: "leads", label: "Demandes", path: "/leads", icon: <InboxOutlined />, badge: "leads" },
      { key: "clients", label: "Clients", path: "/clients", icon: <TeamOutlined /> },
      { key: "devis", label: "Devis", path: "/devis", icon: <FileTextOutlined /> },
      { key: "prestations", label: "Prestations", path: "/prestations", icon: <AppstoreOutlined /> },
    ],
  },
  {
    title: "Facturation",
    items: [
      { key: "factures", label: "Factures", path: "/factures", icon: <FileDoneOutlined /> },
      { key: "paiements", label: "Paiements", path: "/paiements", icon: <WalletOutlined /> },
      { key: "abonnements", label: "Abonnements", path: "/abonnements", icon: <SyncOutlined /> },
    ],
  },
  {
    title: "Support",
    items: [
      { key: "tickets", label: "Tickets", path: "/tickets", icon: <CustomerServiceOutlined />, badge: "tickets" },
      { key: "questions", label: "Questions reçues", path: "/support/questions", icon: <QuestionCircleOutlined />, badge: "questions" },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "emails", label: "Emails envoyés", path: "/communication/emails", icon: <MailOutlined /> },
      { key: "modeles", label: "Modèles d'emails", path: "/communication/modeles", icon: <FileSearchOutlined /> },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { key: "stats", label: "Statistiques", path: "/pilotage/statistiques", icon: <BarChartOutlined /> },
      { key: "ca", label: "Chiffre d'affaires", path: "/pilotage/chiffre-affaires", icon: <LineChartOutlined /> },
      { key: "recurrent", label: "Récurrent (MRR/ARR)", path: "/pilotage/recurrent", icon: <RiseOutlined /> },
      { key: "commercial", label: "Performance", path: "/pilotage/commercial", icon: <AimOutlined /> },
    ],
  },
  {
    title: "Contenu",
    items: [{ key: "prix", label: "Prix & bandeau", path: "/contenu/prix", icon: <TagsOutlined /> }],
  },
  {
    title: "Système",
    items: [
      { key: "utilisateurs", label: "Utilisateurs", path: "/systeme/utilisateurs", icon: <UserOutlined /> },
      { key: "parametres", label: "Paramètres", path: "/systeme/parametres", icon: <SettingOutlined /> },
      { key: "securite", label: "Sécurité", path: "/systeme/securite", icon: <SafetyOutlined /> },
      { key: "automatisations", label: "Automatisations", path: "/systeme/automatisations", icon: <RobotOutlined /> },
      { key: "sauvegardes", label: "Sauvegardes", path: "/systeme/sauvegardes", icon: <CloudServerOutlined /> },
      { key: "journal", label: "Journal d'activité", path: "/systeme/journal", icon: <HistoryOutlined /> },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);

/** Entrée de menu correspondant à l'URL courante (préfixe le plus long). */
export function activeKey(pathname: string): string {
  let best = "dashboard";
  let len = 0;
  for (const it of ALL) {
    if (it.path === "/") continue;
    if ((pathname === it.path || pathname.startsWith(it.path + "/")) && it.path.length > len) {
      best = it.key;
      len = it.path.length;
    }
  }
  return best;
}
