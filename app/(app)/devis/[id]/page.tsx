import { Suspense } from "react";
import QuoteEditor from "@/components/QuoteEditor";

async function Editor({ params }: Pick<PageProps<"/devis/[id]">, "params">) {
  const { id } = await params;
  return <QuoteEditor id={id} />;
}

export default function EditQuote({ params }: PageProps<"/devis/[id]">) {
  return (
    <Suspense fallback={null}>
      <Editor params={params} />
    </Suspense>
  );
}
