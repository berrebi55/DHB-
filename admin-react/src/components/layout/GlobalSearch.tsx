import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Modal, Spin } from "antd";
import {
  CustomerServiceOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  InboxOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../supabaseClient";
import { cleanSearch, eur } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { label } from "../../lib/statuts";
import { NAV } from "./nav";

interface Resultat {
  groupe: string;
  titre: string;
  sous?: string;
  to: string;
  icon: React.ReactNode;
}

/** Palette de recherche globale (Ctrl/⌘ + K) : écrans, clients, demandes, devis, factures, tickets. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 220);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resultat[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const pages = useMemo<Resultat[]>(() => {
    const t = dq.trim().toLowerCase();
    if (!t) return [];
    return NAV.flatMap((g) => g.items)
      .filter((i) => i.label.toLowerCase().includes(t))
      .map((i) => ({ groupe: "Écrans", titre: i.label, to: i.path, icon: i.icon }));
  }, [dq]);

  useEffect(() => {
    const term = cleanSearch(dq);
    if (term.length < 2) {
      setData([]);
      return;
    }
    let annule = false;
    setLoading(true);
    const like = `%${term}%`;
    Promise.all([
      supabaseClient.from("clients").select("id, nom, entreprise, email, ville")
        .or(`nom.ilike.${like},entreprise.ilike.${like},email.ilike.${like},telephone.ilike.${like}`).limit(5),
      supabaseClient.from("leads").select("id, nom, email, entreprise, status, type")
        .or(`nom.ilike.${like},email.ilike.${like},entreprise.ilike.${like},message.ilike.${like}`).limit(5),
      supabaseClient.from("devis").select("id, numero, client_nom, total_ttc, statut")
        .or(`numero.ilike.${like},client_nom.ilike.${like}`).limit(5),
      supabaseClient.from("factures").select("id, numero, client_nom, total_ttc, status")
        .or(`numero.ilike.${like},client_nom.ilike.${like}`).limit(5),
      supabaseClient.from("tickets").select("id, sujet, client_nom, status")
        .or(`sujet.ilike.${like},client_nom.ilike.${like}`).limit(5),
    ]).then(([c, l, d, f, t]) => {
      if (annule) return;
      const out: Resultat[] = [];
      (c.data ?? []).forEach((r: any) => out.push({ groupe: "Clients", titre: r.nom || r.entreprise || "—", sous: [r.entreprise, r.email, r.ville].filter(Boolean).join(" · "), to: `/clients/${r.id}`, icon: <TeamOutlined /> }));
      (l.data ?? []).forEach((r: any) => out.push({ groupe: "Demandes", titre: r.nom || r.email || "—", sous: `${r.type === "question" ? "Question" : "Demande de devis"} · ${label("lead", r.status)}`, to: `/leads/${r.id}`, icon: <InboxOutlined /> }));
      (d.data ?? []).forEach((r: any) => out.push({ groupe: "Devis", titre: r.numero || "Devis", sous: `${r.client_nom ?? ""} · ${eur(r.total_ttc)} · ${label("devis", r.statut)}`, to: `/devis/${r.id}`, icon: <FileTextOutlined /> }));
      (f.data ?? []).forEach((r: any) => out.push({ groupe: "Factures", titre: r.numero || "Facture", sous: `${r.client_nom ?? ""} · ${eur(r.total_ttc)} · ${label("facture", r.status)}`, to: `/factures/${r.id}`, icon: <FileDoneOutlined /> }));
      (t.data ?? []).forEach((r: any) => out.push({ groupe: "Tickets", titre: r.sujet || "Ticket", sous: `${r.client_nom ?? ""} · ${label("ticket", r.status)}`, to: `/tickets/${r.id}`, icon: <CustomerServiceOutlined /> }));
      setData(out);
      setActive(0);
      setLoading(false);
    });
    return () => {
      annule = true;
    };
  }, [dq]);

  const all = [...pages, ...data];
  const go = (r?: Resultat) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, all.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); go(all[active]); }
  };

  let lastGroup = "";
  return (
    <Modal open={open} onCancel={onClose} footer={null} closable={false} width={620} className="cmdk" destroyOnClose
      styles={{ body: { padding: 0 } }} style={{ top: 90 }}>
      <Input
        ref={inputRef}
        className="cmdk-input"
        prefix={<SearchOutlined style={{ color: "#667085", marginRight: 6 }} />}
        placeholder="Rechercher un client, un devis, une facture, un ticket… ou un écran"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        allowClear
        aria-label="Recherche globale"
      />
      <div className="cmdk-results" role="listbox">
        {loading && <div style={{ padding: 18, textAlign: "center" }}><Spin size="small" /></div>}
        {!loading && q.trim().length >= 2 && all.length === 0 && (
          <div style={{ padding: "22px 18px", color: "#5b6576" }}>Aucun résultat pour « {q.trim()} ».</div>
        )}
        {!loading && q.trim().length < 2 && (
          <div style={{ padding: "18px 18px", color: "#667085", fontSize: 13 }}>
            Tapez au moins 2 caractères : nom, entreprise, email, numéro de devis ou de facture…
          </div>
        )}
        {all.map((r, i) => {
          const header = r.groupe !== lastGroup ? <div className="cmdk-group">{r.groupe}</div> : null;
          lastGroup = r.groupe;
          return (
            <div key={`${r.to}-${i}`}>
              {header}
              <div className={`cmdk-item${i === active ? " active" : ""}`} role="option" aria-selected={i === active}
                onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                <span className="ico">{r.icon}</span>
                <span className="l"><b>{r.titre}</b>{r.sous && <span>{r.sous}</span>}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cmdk-hint"><span>↑ ↓ naviguer</span><span>Entrée ouvrir</span><span>Échap fermer</span></div>
    </Modal>
  );
}
