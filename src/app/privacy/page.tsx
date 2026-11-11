import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <Logo /><h1 className="mt-8 text-2xl font-semibold">Privacy policy (template)</h1>
      <p className="mt-2 rounded bg-brand-yellow/30 p-3">This is a template for a portfolio project. Have it reviewed and adapted before running CampaignProof as a public service.</p>
      <h2 className="mt-6 font-semibold">What we store</h2>
      <p>Your email and name; the campaigns, briefs and audit results you create; copies of the Buffer post text you choose to import; and, if you connect Buffer, encrypted access and refresh tokens plus your Buffer account email and organization name.</p>
      <h2 className="mt-6 font-semibold">What we do with it</h2>
      <p>Data is used only to run audits and corrections for you. Audits are rule-based and run on our server; post text is not sent to any AI service or third party. Buffer tokens are encrypted at rest and never sent to your browser.</p>
      <h2 className="mt-6 font-semibold">Buffer</h2>
      <p>With your permission, CampaignProof reads your channels and scheduled posts. It changes a post only after you approve a specific correction and confirm it.</p>
      <h2 className="mt-6 font-semibold">Your controls</h2>
      <p>Disconnect Buffer in Settings to delete stored tokens. Deleting a campaign removes its posts, audits and corrections. Contact the operator to delete your account entirely.</p>
      <p className="mt-8"><Link className="text-brand underline" href="/">Back to home</Link></p>
    </main>
  );
}
