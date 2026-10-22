import { Button } from "antd";
import { CompassOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { EmptyState, Panel } from "../components/ui";

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Panel>
      <EmptyState
        icon={<CompassOutlined />}
        title="Cette page n'existe pas"
        description="Le lien est peut-être ancien ou incomplet. Utilisez le menu ou la recherche (Ctrl + K) pour retrouver ce que vous cherchez."
        action={<Button type="primary" onClick={() => navigate("/")}>Retour au tableau de bord</Button>}
      />
    </Panel>
  );
};
