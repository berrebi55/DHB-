import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { CheckOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useLogin } from "@refinedev/core";
import { supabaseClient } from "../supabaseClient";

export const LoginPage = () => {
  const { mutate: login, isLoading } = useLogin<{ email: string; password: string }>();
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form] = Form.useForm();

  const onFinish = (v: { email: string; password: string }) => {
    setErreur(null);
    login(v, {
      onSuccess: (r) => {
        if (!r.success) setErreur(r.error?.message ?? "Connexion impossible.");
      },
    });
  };

  const motDePasseOublie = async () => {
    setErreur(null);
    const email = form.getFieldValue("email");
    if (!email) {
      setErreur("Saisissez d'abord votre adresse email.");
      return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) setErreur(error.message);
    else setInfo("Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.");
  };

  return (
    <div className="login-wrap">
      <aside className="login-side">
        <div className="brand" style={{ border: "none", padding: 0 }}>
          <div className="brand-mark" style={{ background: "#fff", color: "#0E1B2E" }}>DHB</div>
          <div className="brand-text"><div className="brand-name" style={{ color: "#fff" }}>DHB</div><div className="brand-sub">Back-office</div></div>
        </div>
        <div>
          <h2>Le centre de pilotage de votre activité.</h2>
          <p style={{ margin: 0 }}>Demandes, clients, devis, factures, abonnements et support : tout au même endroit.</p>
          <ul>
            {["Ce qui demande votre attention, dès l'ouverture", "Devis signés en ligne par vos clients", "Chiffres calculés uniquement sur vos données réelles"].map((t) => (
              <li key={t}><CheckOutlined style={{ color: "#7CD4C2", marginTop: 4 }} /> <span>{t}</span></li>
            ))}
          </ul>
        </div>
        <div style={{ fontSize: 12.5, color: "#8A9AB3" }}>Accès réservé à l'équipe DHB.</div>
      </aside>
      <main className="login-main">
        <div className="login-card">
          <div className="brand-mark" aria-hidden="true">DHB</div>
          <h1>Connexion</h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Connectez-vous avec votre compte DHB.</p>
          {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 16 }} />}
          {info && <Alert type="success" showIcon message={info} style={{ marginBottom: 16 }} />}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item name="email" label="Adresse email" rules={[{ required: true, message: "Saisissez votre email." }, { type: "email", message: "Adresse email invalide." }]}>
              <Input prefix={<MailOutlined style={{ color: "#667085" }} />} autoComplete="email" placeholder="vous@exemple.fr" />
            </Form.Item>
            <Form.Item name="password" label="Mot de passe" rules={[{ required: true, message: "Saisissez votre mot de passe." }]}>
              <Input.Password prefix={<LockOutlined style={{ color: "#667085" }} />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>Se connecter</Button>
          </Form>
          <Button type="link" onClick={motDePasseOublie} style={{ padding: 0, marginTop: 12 }}>Mot de passe oublié ?</Button>
        </div>
      </main>
    </div>
  );
};
