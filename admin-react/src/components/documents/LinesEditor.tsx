import { Button, Input, InputNumber, Select, Space, Tooltip } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import { eur, ligneTotal, type Ligne } from "../../lib/format";

export interface Prestation {
  id: string;
  libelle: string;
  description: string | null;
  prix_unitaire: number;
  unite: string | null;
  entity: string;
  actif: boolean;
}

export const ligneVide = (): Ligne => ({ libelle: "", description: "", qte: 1, pu: 0 });

/** Lignes d'un devis ou d'une facture, avec ajout depuis le catalogue de prestations. */
export function LinesEditor({ value, onChange, error }: { value: Ligne[]; onChange: (l: Ligne[]) => void; error?: string }) {
  const { data } = useList<Prestation>({
    resource: "prestations",
    filters: [{ field: "actif", operator: "eq", value: true }],
    sorters: [{ field: "libelle", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { retry: false },
  });
  const catalogue = data?.data ?? [];

  const set = (i: number, patch: Partial<Ligne>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div>
      <table className="lines-table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th className="qty">Qté</th>
            <th className="num">Prix unitaire HT</th>
            <th className="num">Total HT</th>
            <th className="act" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {value.map((l, i) => (
            <tr key={i}>
              <td className="desc">
                <Input
                  value={l.libelle}
                  placeholder="Ex. Intervention sur site — diagnostic réseau"
                  onChange={(e) => set(i, { libelle: e.target.value })}
                  status={error && !l.libelle.trim() ? "error" : undefined}
                  aria-label={`Désignation ligne ${i + 1}`}
                />
                <Input.TextArea
                  value={l.description ?? ""}
                  placeholder="Détail (optionnel)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onChange={(e) => set(i, { description: e.target.value })}
                  style={{ marginTop: 6, fontSize: 13 }}
                  aria-label={`Détail ligne ${i + 1}`}
                />
              </td>
              <td className="qty">
                <InputNumber decimalSeparator="," min={0} step={1} value={l.qte} onChange={(v) => set(i, { qte: Number(v) || 0 })} style={{ width: "100%" }} aria-label="Quantité" />
              </td>
              <td className="num">
                <InputNumber decimalSeparator="," min={0} step={1} precision={2} value={l.pu} onChange={(v) => set(i, { pu: Number(v) || 0 })} style={{ width: "100%" }} addonAfter="€" aria-label="Prix unitaire" />
              </td>
              <td className="num"><div className="line-total">{eur(ligneTotal(l))}</div></td>
              <td className="act">
                <Tooltip title="Supprimer la ligne">
                  <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(i)} disabled={value.length === 1} aria-label="Supprimer la ligne" />
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 6 }}>{error}</div>}
      <Space wrap style={{ marginTop: 12 }}>
        <Button icon={<PlusOutlined />} onClick={() => onChange([...value, ligneVide()])}>Ajouter une ligne</Button>
        <Select
          placeholder={catalogue.length ? "Ajouter depuis le catalogue…" : "Catalogue vide"}
          aria-label="Ajouter une prestation du catalogue"
          disabled={!catalogue.length}
          value={null}
          style={{ minWidth: 260 }}
          showSearch
          optionFilterProp="label"
          options={catalogue.map((p) => ({ value: p.id, label: `${p.libelle} — ${eur(p.prix_unitaire)}${p.unite ? ` / ${p.unite}` : ""}` }))}
          onChange={(id) => {
            const p = catalogue.find((x) => x.id === id);
            if (!p) return;
            const nouvelle: Ligne = { libelle: p.libelle, description: p.description ?? "", qte: 1, pu: Number(p.prix_unitaire) || 0 };
            // Remplace la première ligne si elle est encore vide.
            if (value.length === 1 && !value[0].libelle.trim() && !value[0].pu) onChange([nouvelle]);
            else onChange([...value, nouvelle]);
          }}
        />
      </Space>
    </div>
  );
}
