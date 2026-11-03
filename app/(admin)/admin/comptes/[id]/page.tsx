import { Suspense } from "react";
import AccountDetail from "@/components/admin/AccountDetail";

async function Detail({ params }: Pick<PageProps<"/admin/comptes/[id]">, "params">) {
  const { id } = await params;
  return <AccountDetail id={id} />;
}

export default function AccountPage({ params }: PageProps<"/admin/comptes/[id]">) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
