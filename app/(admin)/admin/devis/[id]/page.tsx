import { Suspense } from "react";
import QuoteDetail from "@/components/admin/QuoteDetail";

async function Detail({ params }: Pick<PageProps<"/admin/devis/[id]">, "params">) {
  const { id } = await params;
  return <QuoteDetail id={id} />;
}

export default function AdminQuotePage({ params }: PageProps<"/admin/devis/[id]">) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
