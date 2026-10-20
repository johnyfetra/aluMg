import { Suspense } from "react";
import Messenger from "@/components/Messenger";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Messenger />
    </Suspense>
  );
}
