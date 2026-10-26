// Écrans d'accès : plein écran, sans barre de navigation (le découpage présentation / formulaire est dans AuthForm).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="min-h-screen bg-bg">{children}</main>;
}
