import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, ArrowDownOutlined, ArrowUpOutlined, RightOutlined } from "@ant-design/icons";
import { MAPS, type StatutKind, type Tone } from "../../lib/statuts";
import { pct } from "../../lib/format";

/* ---------- En-tête de page : fil d'Ariane, titre, actions ---------- */
export interface Crumb {
  label: string;
  to?: string;
}
export function PageHeader(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  back?: string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="page-header">
      <div className="titles">
        {props.back && (
          <div className="back-link" role="link" tabIndex={0} onClick={() => navigate(props.back!)}
            onKeyDown={(e) => e.key === "Enter" && navigate(props.back!)}>
            <ArrowLeftOutlined /> Retour
          </div>
        )}
        {props.crumbs && props.crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Fil d'Ariane">
            {props.crumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                {i < props.crumbs!.length - 1 && <RightOutlined style={{ fontSize: 9 }} />}
              </span>
            ))}
          </nav>
        )}
        <h1>{props.title}</h1>
        {props.subtitle && <p className="subtitle">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="actions">{props.actions}</div>}
    </div>
  );
}

/* ---------- Étiquette de statut cohérente partout ---------- */
export function StatusTag({ kind, value, dot = true }: { kind: StatutKind; value?: string | null; dot?: boolean }) {
  if (!value) return <span className="faint">—</span>;
  const def = MAPS[kind][value];
  return <span className={`st tone-${def?.tone ?? "neutral"}${dot ? "" : " nodot"}`}>{def?.label ?? value}</span>;
}
export function Pill({ tone, children, dot = false }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return <span className={`st tone-${tone}${dot ? "" : " nodot"}`}>{children}</span>;
}

/* ---------- État vide : explique et propose l'action suivante ---------- */
export function EmptyState(props: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty${props.compact ? " compact" : ""}`}>
      <div className="ico">{props.icon}</div>
      <h4>{props.title}</h4>
      {props.description && <p>{props.description}</p>}
      {props.action}
    </div>
  );
}

/* ---------- Panneau sobre ---------- */
export function Panel(props: {
  title?: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`panel ${props.className ?? ""}`} style={props.style}>
      {(props.title || props.extra) && (
        <div className="panel-head">
          <div>
            {props.title && <h3>{props.title}</h3>}
            {props.hint && <div className="hint">{props.hint}</div>}
          </div>
          {props.extra}
        </div>
      )}
      <div className={`panel-body${props.flush ? " flush" : ""}`}>{props.children}</div>
    </section>
  );
}

/* ---------- Variation : affichée seulement si elle est calculable ---------- */
export function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return null;
  const up = value > 0.05;
  const down = value < -0.05;
  const good = inverse ? down : up;
  const bad = inverse ? up : down;
  const cls = good ? "up" : bad ? "down" : "flat";
  return (
    <span className={`delta ${cls}`}>
      {up ? <ArrowUpOutlined /> : down ? <ArrowDownOutlined /> : null} {pct(value)}
    </span>
  );
}

/* ---------- Indicateur cliquable ---------- */
export function Kpi(props: {
  label: string;
  icon?: ReactNode;
  value: ReactNode;
  empty?: boolean;
  foot?: ReactNode;
  delta?: number | null;
  deltaInverse?: boolean;
  to?: string;
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const content = (
    <>
      <div className="kpi-label">{props.icon}{props.label}</div>
      {props.loading ? (
        <div className="skel" style={{ height: 28, width: "60%" }} />
      ) : (
        <div className={`kpi-value${props.empty ? " muted" : ""}`}>{props.value}</div>
      )}
      <div className="kpi-foot">
        {props.delta != null && <Delta value={props.delta} inverse={props.deltaInverse} />}
        {props.foot}
      </div>
    </>
  );
  if (props.to) {
    return (
      <button type="button" className="kpi" onClick={() => navigate(props.to!)} aria-label={props.label}>
        {content}
      </button>
    );
  }
  return <div className="kpi">{content}</div>;
}

/* ---------- Bandeau « lecture seule » pour les collaborateurs ---------- */
export function ReadOnlyNotice({ show, what = "Cette page" }: { show: boolean; what?: string }) {
  if (!show) return null;
  return (
    <Alert
      className="readonly-banner"
      type="info"
      showIcon
      message={`${what} est en lecture seule pour votre rôle.`}
      description="Seul un administrateur peut modifier ces informations."
    />
  );
}

/* ---------- Bouton de création standard ---------- */
export function CreateButton({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <Button type="primary" icon={icon} onClick={onClick}>
      {children}
    </Button>
  );
}

/* ---------- Squelette de liste ---------- */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="skel" style={{ height: 14, width: "28%" }} />
          <div className="skel" style={{ height: 14, width: "18%" }} />
          <div className="skel" style={{ height: 14, width: "14%" }} />
          <div className="skel" style={{ height: 14, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}
