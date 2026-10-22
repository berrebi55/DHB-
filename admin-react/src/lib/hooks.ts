import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePermissions, useOne, useGetIdentity, useInvalidate } from "@refinedev/core";
import { Grid } from "antd";

export function useRole() {
  const { data, isLoading } = usePermissions<string>();
  return { role: data ?? null, isAdmin: data === "admin", loading: isLoading };
}

export interface Identite {
  id: string;
  name: string;
  email?: string;
  role?: string;
}
export const useIdentite = () => useGetIdentity<Identite>();

export interface Entreprise {
  raison_sociale?: string | null;
  forme_juridique?: string | null;
  siret?: string | null;
  tva_intracom?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  email?: string | null;
  telephone?: string | null;
  site_web?: string | null;
  iban?: string | null;
  bic?: string | null;
  delai_paiement_jours?: number | null;
  validite_devis_jours?: number | null;
  conditions_devis?: string | null;
  mentions_facture?: string | null;
  penalites_retard?: string | null;
}

export function useEntreprise() {
  const { data, isLoading } = useOne<Entreprise>({
    resource: "entreprise",
    id: 1,
    queryOptions: { staleTime: 60_000, retry: false },
  });
  return { entreprise: data?.data ?? null, loading: isLoading };
}

export function useIsMobile() {
  const screens = Grid.useBreakpoint();
  return screens.md === false;
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Filtres de liste stockés dans l'URL (?statut=…&q=…) : un lien filtré est
 * partageable et le dashboard peut ouvrir une liste déjà filtrée.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const o = {} as Record<K, string>;
    keys.forEach((k) => (o[k] = params.get(k) ?? ""));
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const set = useCallback(
    (patch: Partial<Record<K, string | null | undefined>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => {
            if (v === undefined || v === null || v === "") next.delete(k);
            else next.set(k, String(v));
          });
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [state, set] as const;
}

/** Rafraîchit des listes après une modification (y compris les vues d'agrégats). */
export function useRafraichir() {
  const invalidate = useInvalidate();
  return useCallback(
    (...resources: string[]) => resources.forEach((resource) => invalidate({ resource, invalidates: ["all"] })),
    [invalidate],
  );
}
