import { Suspense } from "react";
import Invoice from "@/components/Invoice";

async function Page({ params }: Pick<PageProps<"/devis/[id]/facture">, "params">) {
  const { id } = await params;
  return <Invoice id={id} />;
}

export default function InvoicePage({ params }: PageProps<"/devis/[id]/facture">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}
