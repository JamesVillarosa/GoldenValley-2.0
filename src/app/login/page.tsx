import { hasPin } from "@/lib/actions/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  return <LoginForm firstRun={!(await hasPin())} />;
}
