import type { NotificationProvider } from "@refinedev/core";
import { notification } from "antd";

// Notifications Refine (succès / erreurs des requêtes) affichées avec antd,
// sans embarquer toute la bibliothèque @refinedev/antd.
export const notificationProvider: NotificationProvider = {
  open: ({ key, message, description, type }) => {
    if (type === "progress") return;
    notification[type === "error" ? "error" : "success"]({
      key,
      message,
      description,
      placement: "bottomRight",
      duration: type === "error" ? 6 : 3,
    });
  },
  close: (key) => notification.destroy(key),
};
