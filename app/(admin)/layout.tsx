import RoleGuard from "@/components/RoleGuard";
import Shell from "@/components/Shell";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <RoleGuard allow={["admin"]}>
      <Shell>{children}</Shell>
    </RoleGuard>
  );
}
