"use client";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { VOICE_MAX_MS } from "@/lib/attach";
import type { T } from "@/lib/i18n";

export type Recorded = { blob: Blob; mime: string; durationMs: number; name: string };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Format que le navigateur sait enregistrer : webm/opus (Chrome, Firefox, Edge), mp4/aac (Safari), ogg en dernier recours.
const pickMime = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

// Barre d'enregistrement à la place du champ de message : point rouge, durée, niveau sonore en direct, annuler / envoyer.
export function RecorderBar({ t, onSend, onCancel, onError, onTick }: { t: T; onSend: (r: Recorded) => void; onCancel: () => void; onError: (msg: string) => void; onTick?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(28).fill(0.08));
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const finish = useRef<"send" | "cancel" | null>(null);
  const done = useRef(false);
  // les rappels changent à chaque rendu : on garde les derniers sans relancer l'enregistrement
  const cb = useRef({ onSend, onCancel, onError, onTick });
  const msg = useRef(t("msg.micDenied"));
  useEffect(() => {
    cb.current = { onSend, onCancel, onError, onTick };
    msg.current = t("msg.micDenied");
  });

  useEffect(() => {
    let alive = true;
    let ctx: AudioContext | null = null;
    let lastTick = 0;
    const cleanup: (() => void)[] = []; // minuteurs à arrêter à la fermeture
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((tr) => tr.stop());
        stream.current = s;
        const mime = pickMime();
        const r = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined);
        rec.current = r;
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        r.onstop = () => {
          s.getTracks().forEach((tr) => tr.stop());
          if (done.current) return;
          done.current = true;
          if (finish.current !== "send") return cb.current.onCancel();
          const base = (r.mimeType || mime || "audio/webm").split(";")[0];
          const blob = new Blob(chunks.current, { type: base });
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          cb.current.onSend({ blob, mime: base, durationMs: Math.min(Date.now() - started.current, VOICE_MAX_MS), name: `vocal-${stamp}.${EXT[base] ?? "webm"}` });
        };
        r.start(250);
        started.current = Date.now();
        // niveau sonore en direct (barres) ; si le navigateur refuse l'analyse, la durée seule suffit
        try {
          ctx = new AudioContext();
          const an = ctx.createAnalyser();
          an.fftSize = 256;
          ctx.createMediaStreamSource(s).connect(an);
          const buf = new Uint8Array(an.frequencyBinCount);
          const level = window.setInterval(() => {
            an.getByteTimeDomainData(buf);
            const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v - 128)), 0) / 128;
            setBars((b) => [...b.slice(1), Math.min(1, Math.max(0.08, peak * 2.2))]);
          }, 80);
          cleanup.push(() => window.clearInterval(level));
        } catch {
          /* pas de barres */
        }
        const clock = window.setInterval(() => {
          const ms = Date.now() - started.current;
          setElapsed(ms);
          if (Date.now() - lastTick > 2500) {
            lastTick = Date.now();
            cb.current.onTick?.();
          }
          if (ms >= VOICE_MAX_MS && r.state === "recording") {
            finish.current = "send";
            r.stop();
          }
        }, 200);
        cleanup.push(() => window.clearInterval(clock));
      })
      .catch(() => alive && cb.current.onError(msg.current));
    return () => {
      alive = false;
      cleanup.forEach((f) => f());
      void ctx?.close();
      if (rec.current && rec.current.state !== "inactive") {
        finish.current = "cancel";
        rec.current.stop();
      }
      stream.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []); // une seule fois : relancer l'effet interromprait l'enregistrement

  const stop = (what: "send" | "cancel") => {
    finish.current = what;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    else cb.current.onCancel();
  };

  return (
    <div role="group" aria-label={t("msg.recording")} className="flex items-center gap-2">
      <button type="button" onClick={() => stop("cancel")} aria-label={t("msg.cancelVoice")} title={t("msg.cancelVoice")} className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger">
        <Trash2 size={17} aria-hidden />
      </button>
      <div className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-surface-2/50 px-3">
        <span aria-hidden className="voice-rec-dot size-2.5 shrink-0 rounded-full bg-danger" />
        <span className="w-10 shrink-0 text-sm font-medium tabular-nums" role="timer">{mmss(elapsed)}</span>
        <div aria-hidden className="flex h-6 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
          {bars.map((v, i) => (
            <span key={i} className="w-[3px] shrink-0 rounded-full bg-primary/70" style={{ height: `${Math.round(v * 100)}%` }} />
          ))}
        </div>
      </div>
      <button type="button" onClick={() => stop("send")} aria-label={t("msg.stopSend")} title={t("msg.stopSend")} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-hover">
        <Send size={17} aria-hidden />
      </button>
    </div>
  );
}

// Lecteur d'un message vocal : lecture / pause, barre de progression, durée, vitesse.
export function VoicePlayer({ src, durationMs, mine, t }: { src: string; durationMs: number | null; mine: boolean; t: T }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(durationMs ?? 0);
  const [rate, setRate] = useState(1);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const seek = (v: number) => {
    const a = audio.current;
    if (a) a.currentTime = (v / 1000) * (dur / 1000);
    setPos(v / 1000 * dur);
  };
  const cycle = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };
  const tone = mine ? "text-on-primary" : "text-ink";
  const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;

  return (
    <div className="flex w-56 max-w-full items-center gap-2.5">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0 && setDur(e.currentTarget.duration * 1000)}
      />
      <button type="button" onClick={toggle} aria-label={t(playing ? "msg.pause" : "msg.play")} className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${mine ? "bg-white/20 hover:bg-white/30" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
        {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={1000}
          value={dur ? Math.round((pos / dur) * 1000) : 0}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t("msg.voiceNote")}
          className="bare-focus h-1 w-full cursor-pointer appearance-none rounded-full bg-current/25 accent-current"
          style={{ backgroundImage: `linear-gradient(currentColor, currentColor)`, backgroundSize: `${pct}% 100%`, backgroundRepeat: "no-repeat", color: mine ? "var(--on-primary)" : "var(--primary)" }}
        />
        <span className={`mt-1 flex items-center justify-between text-[11px] tabular-nums ${tone} opacity-75`}>
          <span>{mmss(playing || pos ? pos : dur)}</span>
          <button type="button" onClick={cycle} aria-label={`${rate}×`} className="rounded px-1 font-semibold hover:bg-black/10">{rate}×</button>
        </span>
      </div>
    </div>
  );
}

export function MicButton({ t, onClick, disabled, small = false }: { t: T; onClick: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={t("msg.mic")} title={t("msg.mic")} className={`grid shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50 ${small ? "size-9" : "size-10"}`}>
      <Mic size={18} aria-hidden />
    </button>
  );
}
