import { Suspense } from "react";
import NeedsPage from "@/components/NeedsPage";

async function Page({ params }: Pick<PageProps<"/devis/[id]/profils/[line]">, "params">) {
  const { id, line } = await params;
  return <NeedsPage id={id} lineId={line} />;
}

export default function LineNeeds({ params }: PageProps<"/devis/[id]/profils/[line]">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}
