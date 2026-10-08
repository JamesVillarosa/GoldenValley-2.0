import { connection } from "next/server";
import { hasPin } from "@/lib/actions/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  // Without this the page is prerendered and "is a PIN set?" is frozen at build time.
  await connection();
  return <LoginForm firstRun={!(await hasPin())} />;
}
