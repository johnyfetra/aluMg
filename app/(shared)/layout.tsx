import Shell from "@/components/Shell";

export default function SharedLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
