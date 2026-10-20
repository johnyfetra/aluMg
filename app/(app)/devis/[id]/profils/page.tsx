import { Suspense } from "react";
import NeedsPage from "@/components/NeedsPage";

async function Page({ params }: Pick<PageProps<"/devis/[id]/profils">, "params">) {
  const { id } = await params;
  return <NeedsPage id={id} />;
}

export default function QuoteNeeds({ params }: PageProps<"/devis/[id]/profils">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}
