import { Suspense } from "react";
import Workshop from "@/components/Workshop";

async function Page({ params }: Pick<PageProps<"/devis/[id]/atelier">, "params">) {
  const { id } = await params;
  return <Workshop id={id} />;
}

export default function WorkshopPage({ params }: PageProps<"/devis/[id]/atelier">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}
