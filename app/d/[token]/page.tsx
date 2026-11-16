import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import SharedQuote from "@/components/SharedQuote";
import { getSharedQuote } from "@/lib/workflow";

// Devis ouvert depuis le lien WhatsApp du menuisier : pas de compte, pas d'indexation par les moteurs de recherche.
const TOKEN = /^[A-Za-z0-9_-]{16}$/;
const load = async (token: string) => (TOKEN.test(token) ? getSharedQuote(token) : null);

export async function generateMetadata({ params }: Pick<PageProps<"/d/[token]">, "params">): Promise<Metadata> {
  const { token } = await params;
  await connection();
  const data = await load(token);
  const title = data ? `Devis ${data.quote.number} · ${data.issuer.company}` : "Devis · AluMg";
  return { title, robots: { index: false, follow: false }, openGraph: { title, description: data?.quote.project || undefined } };
}

async function View({ params }: Pick<PageProps<"/d/[token]">, "params">) {
  const { token } = await params;
  await connection(); // lu en base à chaque ouverture : le menuisier peut modifier ou retirer le devis
  const data = await load(token);
  return <SharedQuote data={data} />;
}

export default function SharedQuotePage({ params }: PageProps<"/d/[token]">) {
  return (
    <Suspense fallback={null}>
      <View params={params} />
    </Suspense>
  );
}
