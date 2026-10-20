import { Suspense } from "react";
import RequestForm from "@/components/RequestForm";

export default function NewRequestPage() {
  return (
    <Suspense fallback={null}>
      <RequestForm />
    </Suspense>
  );
}
