import { notFound } from "next/navigation";
import { Suspense } from "react";
import DemoRender from "./DemoRender";

// Page de développement : produit les « photos » de démonstration (scripts/make-demo-assets.mjs). Absente en production.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <DemoRender />
    </Suspense>
  );
}
