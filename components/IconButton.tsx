import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Bouton rond à icône seule, des barres du haut (application et vitrine) : même taille, même survol, toujours un nom accessible.
// `tip` : texte de la bulle au survol (par défaut le nom ; false pour ne pas en mettre). Avec `href`, c'est un lien.
type Base = { label: string; tip?: string | false; className?: string; children: ReactNode };
type AsButton = Base & Omit<ComponentProps<"button">, "aria-label" | "children" | "className"> & { href?: undefined };
type AsLink = Base & Omit<ComponentProps<typeof Link>, "aria-label" | "children" | "className">;

export default function IconButton({ label, tip = label, className = "", children, ...rest }: AsButton | AsLink) {
  const shared = { "aria-label": label, "data-tooltip": tip || undefined, className: `top-btn ${className}` };
  if (rest.href !== undefined) return <Link {...(rest as Omit<AsLink, keyof Base>)} {...shared}>{children}</Link>;
  return <button type="button" {...(rest as Omit<AsButton, keyof Base>)} {...shared}>{children}</button>;
}
