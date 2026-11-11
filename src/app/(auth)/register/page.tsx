import { AuthForm } from "@/components/actions";

export const metadata = { title: "Create account" };

export default function Register() {
  return (<><h1 className="mb-4 text-xl font-semibold">Create your account</h1><AuthForm mode="register" /></>);
}
