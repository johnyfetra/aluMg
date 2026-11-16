"use client";
import { useEffect, useRef, useState } from "react";
import { NEW_DRAFT, clearDraft, loadDraft, saveDraft } from "@/lib/offline";
import type { Quote } from "@/lib/model";

// Brouillon gardé dans le téléphone à chaque modification : rien n'est perdu si le réseau coupe avant l'enregistrement.
// Le brouillon d'un devis existant n'est repris que s'il part de la même version (sinon le client ou un autre appareil l'a changé entre-temps).
export function useDraft(existing: Quote | undefined, fresh: () => Quote) {
  const key = existing?.id ?? NEW_DRAFT;
  const [initial] = useState(() => {
    const d = loadDraft(key);
    const usable = d && (!existing || (d.rev === existing.rev && d.status === existing.status));
    if (d && !usable) clearDraft(key);
    return { quote: usable ? d : (existing ?? fresh()), restored: !!usable };
  });
  const [q, setQ] = useState<Quote>(initial.quote);
  const clean = useRef<Quote | undefined>(existing);
  useEffect(() => {
    if (q !== clean.current) saveDraft(key, q);
  }, [q, key]);
  // devis enregistré sur le serveur : le brouillon n'a plus lieu d'être
  const commit = (saved: Quote) => {
    clean.current = saved;
    clearDraft(key);
    clearDraft(saved.id);
    setQ(saved);
  };
  return { q, setQ, commit, restored: initial.restored };
}
