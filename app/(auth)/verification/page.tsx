import { Suspense } from "react";
import VerifyAccount from "@/components/access/VerifyAccount";

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerifyAccount />
    </Suspense>
  );
}
