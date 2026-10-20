import { Suspense } from "react";
import ClientQuoteView from "@/components/ClientQuoteView";

async function View({ params }: Pick<PageProps<"/espace-client/devis/[id]">, "params">) {
  const { id } = await params;
  return <ClientQuoteView id={id} />;
}

export default function ClientQuotePage({ params }: PageProps<"/espace-client/devis/[id]">) {
  return (
    <Suspense fallback={null}>
      <View params={params} />
    </Suspense>
  );
}
