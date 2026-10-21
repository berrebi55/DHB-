import { AuthPage } from "@refinedev/antd";

export const LoginPage = () => (
  <AuthPage
    type="login"
    title="DHB — Administration"
    registerLink={false}
    forgotPasswordLink={false}
    formProps={{
      initialValues: { email: "", password: "" },
    }}
  />
);
