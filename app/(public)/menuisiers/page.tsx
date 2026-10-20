import { Suspense } from "react";
import Directory from "@/components/Directory";

export default function DirectoryPage() {
  return (
    <Suspense fallback={null}>
      <Directory />
    </Suspense>
  );
}
