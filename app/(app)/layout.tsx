import RoleGuard from "@/components/RoleGuard";
import Shell from "@/components/Shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <RoleGuard allow={["menuisier", "admin"]}>
      <Shell>{children}</Shell>
    </RoleGuard>
  );
}
