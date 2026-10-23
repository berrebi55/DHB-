import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface Onglet { key: string; label: ReactNode; children?: ReactNode }

/**
 * Onglets accessibles (lot 15), à la place des Tabs d'Ant Design : quand les
 * onglets débordent, Ant ajoute un bouton « … » à l'intérieur de la liste
 * d'onglets (structure refusée par les lecteurs d'écran). Ici la rangée défile
 * simplement. Clavier : flèches gauche / droite, Début, Fin.
 * Sans `children`, ce sont des filtres (pas de panneau associé).
 */
export function Onglets({ items, activeKey, onChange, label, className }: {
  items: Onglet[]; activeKey: string; onChange: (key: string) => void; label: string; className?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const actif = items.find((o) => o.key === activeKey) ?? items[0];
  const panneau = actif?.children !== undefined;

  const clavier = (e: KeyboardEvent, i: number) => {
    const n = items.length;
    const cible = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n
      : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (cible < 0) return;
    e.preventDefault();
    refs.current[cible]?.focus();
    onChange(items[cible].key);
  };

  return (
    <>
      <div role="tablist" aria-label={label} className={`onglets${className ? ` ${className}` : ""}`}>
        {items.map((o, i) => {
          const choisi = o.key === actif?.key;
          return (
            <button key={o.key} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`${id}-o-${o.key}`}
              aria-selected={choisi} aria-controls={panneau && choisi ? `${id}-p` : undefined} tabIndex={choisi ? 0 : -1}
              className="onglet" onClick={() => onChange(o.key)} onKeyDown={(e) => clavier(e, i)}>
              {o.label}
            </button>
          );
        })}
      </div>
      {panneau && (
        <div role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-o-${actif.key}`} tabIndex={0} className="onglets-panneau">
          {actif.children}
        </div>
      )}
    </>
  );
}
