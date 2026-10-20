import { Suspense } from "react";
import MenuisierProfile from "@/components/MenuisierProfile";

async function Profile({ params }: Pick<PageProps<"/menuisiers/[slug]">, "params">) {
  const { slug } = await params;
  return <MenuisierProfile slug={slug} />;
}

export default function MenuisierPage({ params }: PageProps<"/menuisiers/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Profile params={params} />
    </Suspense>
  );
}
