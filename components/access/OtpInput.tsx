"use client";
import { useRef } from "react";

// Saisie d'un code à N chiffres : une case par chiffre, passage automatique à la suivante, collage du code entier, suppression arrière.
export default function OtpInput({ value, onChange, length = 6, disabled, label }: { value: string; onChange: (v: string) => void; length?: number; disabled?: boolean; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, length));
  };

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`${label} ${i + 1}`}
          className="input !h-12 !min-h-12 w-full min-w-0 text-center text-xl font-semibold tabular-nums"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return set(i, "");
            set(i, v.slice(-1));
            if (i < length - 1) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d) {
              e.preventDefault();
              set(Math.max(0, i - 1), "");
              focus(i - 1);
            }
            if (e.key === "ArrowLeft") focus(i - 1);
            if (e.key === "ArrowRight") focus(i + 1);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!text) return;
            e.preventDefault();
            onChange(text);
            focus(text.length >= length ? length - 1 : text.length);
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
      ))}
    </div>
  );
}
