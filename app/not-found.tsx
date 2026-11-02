import type { Metadata } from "next";
import { NotFoundView } from "@/components/ErrorPages";

export const metadata: Metadata = { title: "Page introuvable · AluMg", robots: { index: false } };

export default function NotFound() {
  return <NotFoundView />;
}
