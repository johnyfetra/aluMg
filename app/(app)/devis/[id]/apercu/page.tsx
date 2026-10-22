import { Suspense } from "react";
import QuotePreview from "@/components/QuotePreview";

async function Preview({ params }: Pick<PageProps<"/devis/[id]/apercu">, "params">) {
  const { id } = await params;
  return <QuotePreview id={id} />;
}

export default function PreviewPage({ params }: PageProps<"/devis/[id]/apercu">) {
  return (
    <Suspense fallback={null}>
      <Preview params={params} />
    </Suspense>
  );
}
