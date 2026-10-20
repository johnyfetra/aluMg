import RoleGuard from "@/components/RoleGuard";
import Shell from "@/components/Shell";

export default function ClientLayout({ children }: LayoutProps<"/">) {
  return (
    <RoleGuard allow={["client"]}>
      <Shell>{children}</Shell>
    </RoleGuard>
  );
}
