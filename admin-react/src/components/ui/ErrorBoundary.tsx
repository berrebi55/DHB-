import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";

/** Erreur de chargement d'un morceau de l'application (souvent : nouvelle version déployée). */
const estErreurDeChunk = (e: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(String((e as Error)?.message ?? e));

/**
 * Empêche l'écran blanc : une erreur dans un composant n'affecte que le bloc
 * concerné, avec un message clair et un bouton pour réessayer.
 * `resetKey` : quand il change (ex. changement de page), le bloc se réinitialise.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: unknown; compact?: boolean; titre?: string },
  { erreur: unknown }
> {
  state = { erreur: null as unknown };

  static getDerivedStateFromError(erreur: unknown) {
    return { erreur };
  }

  componentDidCatch(erreur: unknown, info: ErrorInfo) {
    console.error("[DHB] Erreur d'affichage", erreur, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (this.state.erreur && prev.resetKey !== this.props.resetKey) this.setState({ erreur: null });
  }

  render() {
    const { erreur } = this.state;
    if (!erreur) return this.props.children;
    const chunk = estErreurDeChunk(erreur);
    return (
      <div className={`empty error-state${this.props.compact ? " compact" : ""}`} role="alert">
        <div className="ico"><WarningOutlined /></div>
        <p className="empty-title">{chunk ? "Une nouvelle version est disponible" : this.props.titre ?? "Cette partie n'a pas pu s'afficher"}</p>
        <p>
          {chunk
            ? "Rechargez la page pour utiliser la dernière version du back-office."
            : "Le reste de l'application fonctionne normalement. Vous pouvez réessayer ; si le problème continue, rechargez la page."}
        </p>
        <Button icon={<ReloadOutlined />} onClick={() => (chunk ? window.location.reload() : this.setState({ erreur: null }))}>
          {chunk ? "Recharger la page" : "Réessayer"}
        </Button>
      </div>
    );
  }
}
