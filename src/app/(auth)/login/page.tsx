import { AuthForm } from "@/components/actions";

export const metadata = { title: "Sign in" };

export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  return (<><h1 className="mb-4 text-xl font-semibold">Sign in</h1><AuthForm mode="login" next={searchParams.next} /></>);
}
