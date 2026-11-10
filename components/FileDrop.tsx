"use client";
import { ImageUp } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

// Zone de dépôt d'image : bordure en pointillés, glisser-déposer ou clic (le vrai champ fichier reste dans la zone, donc clavier et lecteurs d'écran fonctionnent).
export default function FileDrop({ id, onFile, label, accept = "image/*" }: { id: string; onFile: (f: File) => void | Promise<void>; label?: string; accept?: string }) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  const take = (files: FileList | null) => {
    const f = files?.[0];
    if (f && (accept !== "image/*" || f.type.startsWith("image/"))) void onFile(f);
  };
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
      className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${over ? "border-primary bg-primary/10" : "border-line bg-surface-2/30 hover:border-primary/60 hover:bg-surface-2/60"}`}
    >
      <ImageUp size={24} aria-hidden className="text-primary" />
      <span className="font-semibold">{label ?? t("file.drop")}</span>
      <span className="text-xs text-muted">{t("file.hint")}</span>
      <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
    </label>
  );
}
