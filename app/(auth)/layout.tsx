export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="grid min-h-screen place-items-center px-4 py-10">{children}</main>;
}
