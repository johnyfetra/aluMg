import { Suspense } from "react";
import ClientQuotePreview from "@/components/ClientQuotePreview";

async function View({ params }: Pick<PageProps<"/espace-client/devis/[id]/apercu">, "params">) {
  const { id } = await params;
  return <ClientQuotePreview id={id} />;
}

export default function ClientQuotePreviewPage({ params }: PageProps<"/espace-client/devis/[id]/apercu">) {
  return (
    <Suspense fallback={null}>
      <View params={params} />
    </Suspense>
  );
}
