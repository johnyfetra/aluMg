"use client";
import { useEffect } from "react";
import { ErrorView } from "@/components/ErrorPages";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error); // l'adresse de référence (digest) permet de retrouver l'erreur dans les journaux du serveur
  }, [error]);
  return <ErrorView reset={reset} digest={error.digest} />;
}
