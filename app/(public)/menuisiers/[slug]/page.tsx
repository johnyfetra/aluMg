import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import MenuisierProfile from "@/components/MenuisierProfile";
import { listPublicMenuisiers } from "@/lib/profiles";

// Titre, description et image de partage (WhatsApp, Facebook) tirés du profil publié.
export async function generateMetadata({ params }: Pick<PageProps<"/menuisiers/[slug]">, "params">): Promise<Metadata> {
  const { slug } = await params;
  await connection(); // le profil vient de la base : métadonnées calculées à chaque requête
  const [m] = await listPublicMenuisiers({ slug, limit: 1 });
  if (!m) return { title: "Menuisier · AluMg" };
  const title = `${m.name}${m.city ? ` · ${m.city}` : ""} · AluMg`;
  const description = (m.bio || `Menuisier aluminium${m.city ? ` à ${m.city}` : ""} : réalisations, avis et demande de devis.`).slice(0, 160);
  return { title, description, openGraph: { title, description, type: "profile", images: m.cover ? [{ url: m.cover }] : undefined } };
}

async function Profile({ params }: Pick<PageProps<"/menuisiers/[slug]">, "params">) {
  const { slug } = await params;
  return <MenuisierProfile slug={slug} />;
}

export default function MenuisierPage({ params }: PageProps<"/menuisiers/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Profile params={params} />
    </Suspense>
  );
}
