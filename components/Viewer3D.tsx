"use client";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useI18n } from "@/lib/i18n";
import { FINISHES, type Line } from "@/lib/model";

export type Viewable = Pick<Line, "category" | "opening" | "leaves" | "shutter" | "control" | "guard" | "infill" | "finish" | "glassType" | "pattern" | "range" | "extras" | "width" | "height">;

// ---------- Matériaux ----------
const GLASS: Record<string, { color: string; opacity: number; rough: number; metal: number }> = {
  clair: { color: "#cfe6ff", opacity: 0.28, rough: 0.05, metal: 0 },
  "teinte-bronze": { color: "#8a6a45", opacity: 0.5, rough: 0.05, metal: 0 },
  "teinte-gris": { color: "#5d6672", opacity: 0.5, rough: 0.05, metal: 0 },
  "teinte-vert": { color: "#4f7d63", opacity: 0.5, rough: 0.05, metal: 0 },
  reflechissant: { color: "#7fa6d4", opacity: 0.6, rough: 0.04, metal: 0.9 },
  feuillete: { color: "#bcd7f4", opacity: 0.35, rough: 0.05, metal: 0 },
  trempe: { color: "#cfe6ff", opacity: 0.28, rough: 0.05, metal: 0 },
  depoli: { color: "#ffffff", opacity: 0.8, rough: 0.9, metal: 0 },
};

type Ctx = { hex: string; highlight: string | null; glass: (typeof GLASS)[string]; reduced: boolean };
const SceneCtx = createContext<Ctx>({ hex: "#ffffff", highlight: null, glass: GLASS.clair, reduced: false });
const useScene = () => useContext(SceneCtx);

// ---------- Mouvement : ressort critiquement amorti (accélère puis freine, sans rebond ni saccade) ----------
function useSpring(target: number, apply: (x: number) => void, omega = 7) {
  const st = useRef({ x: 0, v: 0 });
  const applyRef = useRef(apply);
  const invalidate = useThree((s) => s.invalidate);
  const { reduced } = useScene();
  useLayoutEffect(() => {
    applyRef.current = apply; // toujours la dernière fonction, sans lire de ref pendant le rendu
    applyRef.current(st.current.x);
  });
  useEffect(() => invalidate(), [target, invalidate]);
  useFrame((_, dt) => {
    const s = st.current;
    if (Math.abs(s.x - target) < 1e-4 && Math.abs(s.v) < 1e-4) {
      if (s.x !== target) {
        s.x = target;
        s.v = 0;
        applyRef.current(s.x);
      }
      return;
    }
    const d = Math.min(dt, 0.05);
    const w = reduced ? 60 : omega;
    const x = s.x - target;
    const tmp = (s.v + w * x) * d;
    const e = Math.exp(-w * d);
    s.x = target + (x + tmp) * e;
    s.v = (s.v - w * tmp) * e;
    applyRef.current(s.x);
    invalidate();
  });
}

// ---------- Pièces de base ----------
function Bar({ size, position, element, rotation }: { size: [number, number, number]; position: [number, number, number]; element: string; rotation?: [number, number, number] }) {
  const { hex, highlight } = useScene();
  const hl = highlight === element;
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={hex} metalness={0.6} roughness={0.38} emissive={hl ? "#ff6a00" : "#000000"} emissiveIntensity={hl ? 0.9 : 0} />
    </mesh>
  );
}

function Pane({ w, h, position, thick = 0.006 }: { w: number; h: number; position?: [number, number, number]; thick?: number }) {
  const { glass } = useScene();
  if (w <= 0.001 || h <= 0.001) return null;
  return (
    <mesh position={position}>
      <boxGeometry args={[w, h, thick]} />
      <meshPhysicalMaterial color={glass.color} transparent opacity={glass.opacity} roughness={glass.rough} metalness={glass.metal} depthWrite={false} envMapIntensity={1.3} />
    </mesh>
  );
}

function Panel({ w, h, position }: { w: number; h: number; position?: [number, number, number] }) {
  const { hex } = useScene();
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[w, h, 0.02]} />
      <meshStandardMaterial color={hex} metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

// Corps d'un vantail centré sur l'origine : cadre (traverses, montants) + remplissage selon la catégorie.
function LeafBody({ w, h, v, infill, depth = 0.034 }: { w: number; h: number; v: Viewable; infill: Viewable["infill"]; depth?: number }) {
  const t = 0.04;
  const iw = w - 2 * t;
  const ih = h - 2 * t;
  const isDoor = v.category === "porte";
  return (
    <group>
      <Bar element="el.sashH" size={[w, t, depth]} position={[0, h / 2 - t / 2, 0]} />
      <Bar element="el.sashH" size={[w, t, depth]} position={[0, -h / 2 + t / 2, 0]} />
      <Bar element="el.sashV" size={[t, ih, depth]} position={[-w / 2 + t / 2, 0, 0]} />
      <Bar element="el.sashV" size={[t, ih, depth]} position={[w / 2 - t / 2, 0, 0]} />
      {isDoor && infill === "pleine" && <Panel w={iw} h={ih} />}
      {isDoor && infill === "semi" && (
        <>
          <Pane w={iw} h={ih * 0.6} position={[0, ih * 0.2, 0]} />
          <Bar element="el.mid" size={[iw, 0.04, depth]} position={[0, -ih * 0.1, 0]} />
          <Panel w={iw} h={ih * 0.4 - 0.04} position={[0, -ih * 0.3 - 0.02, 0]} />
        </>
      )}
      {!(isDoor && infill !== "vitree") && <Pane w={iw} h={ih} />}
    </group>
  );
}

function Handle({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.014, 0.12, 0.022]} />
      <meshStandardMaterial color="#2b2f36" metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

// Dormant : cadre fixe autour de l'ouverture.
function Dormant({ W, H, t, depth }: { W: number; H: number; t: number; depth: number }) {
  return (
    <group position={[0, H / 2, 0]}>
      <Bar element="el.dormantH" size={[W, t, depth]} position={[0, H / 2 - t / 2, 0]} />
      <Bar element="el.dormantH" size={[W, t, depth]} position={[0, -H / 2 + t / 2, 0]} />
      <Bar element="el.dormantV" size={[t, H - 2 * t, depth]} position={[-W / 2 + t / 2, 0, 0]} />
      <Bar element="el.dormantV" size={[t, H - 2 * t, depth]} position={[W / 2 - t / 2, 0, 0]} />
    </group>
  );
}

// ---------- Fenêtres et portes coulissantes ----------
function SlideLeaf({ closedX, openX, z, w, h, v, target, onToggle }: { closedX: number; openX: number; z: number; w: number; h: number; v: Viewable; target: number; onToggle: () => void }) {
  const g = useRef<THREE.Group>(null);
  useSpring(target, (x) => g.current && (g.current.position.x = THREE.MathUtils.lerp(closedX, openX, x)), v.category === "porte" ? 5.5 : 7);
  return (
    <group ref={g} position={[closedX, 0, z]} onClick={(e) => clickToggle(e, onToggle)} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      <LeafBody w={w} h={h} v={v} infill={v.infill} />
      <Handle position={[-w / 2 + 0.05, 0, z > 0 ? 0.02 : -0.02]} />
    </group>
  );
}

function Sliding({ v, W, H, t, amounts, toggle }: { v: Viewable; W: number; H: number; t: number; amounts: number[]; toggle: (i: number) => void }) {
  const n = v.leaves;
  const w = W - 2 * t;
  const h = H - 2 * t;
  const ov = 0.04;
  const lv = (w + (n - 1) * ov) / n;
  const x = (i: number) => -w / 2 + lv / 2 + i * (lv - ov);
  return (
    <group position={[0, H / 2, 0]}>
      {Array.from({ length: n }, (_, i) =>
        i % 2 === 0 ? (
          <group key={i} position={[x(i), 0, -0.016]}>
            <LeafBody w={lv} h={h} v={v} infill={v.infill} />
          </group>
        ) : (
          <SlideLeaf key={i} closedX={x(i)} openX={x(i - 1)} z={0.016} w={lv} h={h} v={v} target={amounts[i] ?? 0} onToggle={() => toggle(i)} />
        ),
      )}
    </group>
  );
}

// ---------- Ouvrants : battant, oscillo-battant, soufflet ----------
function CasementLeaf({ hingeLeft, px, lv, h, v, mode, amount, onToggle }: { hingeLeft: boolean; px: number; lv: number; h: number; v: Viewable; mode: "turn" | "tilt"; amount: number; onToggle: () => void }) {
  const turn = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const side = hingeLeft ? -1 : 1;
  const soufflet = v.opening === "soufflet";
  const oscillo = v.opening === "oscillo";
  const turnT = !soufflet && mode === "turn" ? amount : 0;
  const tiltT = oscillo ? (mode === "tilt" ? amount : 0) : soufflet ? amount : 0;
  useSpring(turnT, (x) => turn.current && (turn.current.rotation.y = side * x * 1.75), 6);
  useSpring(tiltT, (x) => tilt.current && (tilt.current.rotation.x = soufflet ? -x * 0.62 : x * 0.2), 6.5);
  // pivot : charnière verticale (battant), bas du vantail (oscillant) ou haut du vantail (soufflet)
  const hx = px + (hingeLeft ? -lv / 2 : lv / 2);
  const pivotY = soufflet ? h / 2 : -h / 2;
  return (
    <group ref={turn} position={[hx, 0, 0]} onClick={(e) => clickToggle(e, onToggle)} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      {/* origine = centre du vantail à la hauteur du pivot ; la rotation « tilt » tourne autour d'un axe horizontal passant par là */}
      <group position={[px - hx, pivotY, 0]}>
        <group ref={tilt}>
          <group position={[0, -pivotY, 0]}>
            <LeafBody w={lv} h={h} v={v} infill={v.infill} />
            <Handle position={[-side * (lv / 2 - 0.05), 0, 0.02]} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Casement({ v, W, H, t, amounts, mode, toggle }: { v: Viewable; W: number; H: number; t: number; amounts: number[]; mode: "turn" | "tilt"; toggle: (i: number) => void }) {
  const n = v.leaves;
  const w = W - 2 * t;
  const h = H - 2 * t;
  const lv = w / n;
  return (
    <group position={[0, H / 2, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const hingeLeft = n === 1 || i < n / 2;
        const cx = -w / 2 + i * lv + lv / 2;
        return <CasementLeaf key={i} hingeLeft={hingeLeft} px={cx} lv={lv - 0.004} h={h - 0.004} v={v} mode={mode} amount={amounts[i] ?? 0} onToggle={() => toggle(i)} />;
      })}
      {n >= 2 && Array.from({ length: Math.floor(n / 2) }, (_, k) => <Bar key={k} element="el.battement" size={[0.03, h, 0.026]} position={[-w / 2 + (2 * k + 1) * lv, 0, -0.018]} />)}
    </group>
  );
}

// ---------- Naco : lames de verre qui basculent ----------
function Louvre({ W, H, t, amount, onToggle }: { W: number; H: number; t: number; amount: number; onToggle: () => void }) {
  const slats = useRef<THREE.Group>(null);
  const k = Math.max(4, Math.ceil((H - 0.04) / 0.1));
  const h = H - 2 * t;
  const w = W - 2 * t - 0.08;
  useSpring(amount, (x) => slats.current?.children.forEach((c) => (c.rotation.x = x * 1.15)), 6);
  return (
    <group position={[0, H / 2, 0]} onClick={(e) => clickToggle(e, onToggle)} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      <Bar element="el.louvre" size={[0.04, h, 0.04]} position={[-W / 2 + t + 0.02, 0, 0]} />
      <Bar element="el.louvre" size={[0.04, h, 0.04]} position={[W / 2 - t - 0.02, 0, 0]} />
      <group ref={slats}>
        {Array.from({ length: k }, (_, i) => (
          <group key={i} position={[0, -h / 2 + (h * (i + 0.5)) / k, 0]}>
            <Pane w={w} h={Math.min(0.1, h / k) * 0.98} />
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------- Volets : roulant et rideau métallique ----------
function Shutter({ v, W, H, amount, onToggle }: { v: Viewable; W: number; H: number; amount: number; onToggle: () => void }) {
  const { hex, highlight } = useScene();
  const rideau = v.shutter === "rideau";
  const pitch = rideau ? 0.07 : 0.037;
  const count = Math.ceil(H / pitch);
  const boxH = 0.2;
  const slats = useRef<THREE.Group>(null);
  const last = useRef<THREE.Mesh>(null);
  const el = rideau ? "el.slatR" : "el.slat";
  // les lames remontent dans le caisson de bas en haut : au-delà de la longueur déroulée, elles disparaissent
  useSpring(amount, (x) => {
    const unrolled = (H - boxH) * (1 - x);
    slats.current?.children.forEach((c, i) => (c.visible = (i + 1) * pitch <= unrolled));
    if (last.current) last.current.position.y = H - boxH - unrolled;
  }, 4.5);
  const hl = highlight === el;
  return (
    <group onClick={(e) => clickToggle(e, onToggle)} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      <Bar element="el.box" size={[W, boxH, 0.2]} position={[0, H - boxH / 2, 0]} />
      {rideau && (
        <mesh position={[0, H - boxH / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, W - 0.02, 24]} />
          <meshStandardMaterial color="#8d949e" metalness={0.7} roughness={0.35} emissive={highlight === "el.shaft" ? "#ff6a00" : "#000"} emissiveIntensity={highlight === "el.shaft" ? 0.9 : 0} />
        </mesh>
      )}
      <Bar element="el.guide" size={[0.04, H - boxH, 0.06]} position={[-W / 2 + 0.02, (H - boxH) / 2, 0]} />
      <Bar element="el.guide" size={[0.04, H - boxH, 0.06]} position={[W / 2 - 0.02, (H - boxH) / 2, 0]} />
      <group ref={slats}>
        {Array.from({ length: Math.max(0, count - 1) }, (_, i) => (
          <mesh key={i} position={[0, H - boxH - (i + 0.5) * pitch, 0]} castShadow>
            <boxGeometry args={[W - 0.08, pitch * 0.92, rideau ? 0.016 : 0.012]} />
            <meshStandardMaterial color={hex} metalness={0.5} roughness={0.42} emissive={hl ? "#ff6a00" : "#000"} emissiveIntensity={hl ? 0.9 : 0} />
          </mesh>
        ))}
      </group>
      <mesh ref={last} position={[0, H - boxH, 0]} castShadow>
        <boxGeometry args={[W - 0.06, 0.035, 0.03]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
      </mesh>
      {v.control === "motorise" && (
        <mesh position={[W / 2 + 0.04, H - boxH / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 20]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

// ---------- Garde-corps et cloison (fixes) ----------
function Guard({ v, W, H }: { v: Viewable; W: number; H: number }) {
  const spans = Math.max(1, Math.ceil(W / 1.2));
  const post = 0.05;
  const rail = 0.05;
  const nb = Math.max(4, Math.min(80, Math.ceil(W / 0.12)));
  return (
    <group>
      <Bar element="el.railTop" size={[W, rail, 0.05]} position={[0, H - rail / 2, 0]} />
      <Bar element="el.railBottom" size={[W, rail, 0.05]} position={[0, rail / 2, 0]} />
      {Array.from({ length: spans + 1 }, (_, i) => <Bar key={i} element="el.post" size={[post, H, post]} position={[-W / 2 + post / 2 + ((W - post) * i) / spans, H / 2, 0]} />)}
      {v.guard === "barreaudage"
        ? Array.from({ length: nb }, (_, i) => <Bar key={i} element="el.bar" size={[0.014, H - 2 * rail, 0.014]} position={[-W / 2 + post + ((W - 2 * post) * (i + 0.5)) / nb, H / 2, 0]} />)
        : Array.from({ length: spans }, (_, i) => <Pane key={i} w={(W - post) / spans - post - 0.02} h={H - 2 * rail - 0.05} position={[-W / 2 + post / 2 + ((W - post) * (i + 0.5)) / spans, H / 2, 0]} thick={0.012} />)}
    </group>
  );
}

function Partition({ v, W, H, t }: { v: Viewable; W: number; H: number; t: number }) {
  const n = v.leaves;
  const w = W - 2 * t;
  const m = 0.04;
  const pw = (w - (n - 1) * m) / n;
  return (
    <group>
      <Dormant W={W} H={H} t={t} depth={0.07} />
      {Array.from({ length: n }, (_, i) => <Pane key={i} w={pw} h={H - 2 * t} position={[-w / 2 + pw / 2 + i * (pw + m), H / 2, 0]} />)}
      {Array.from({ length: n - 1 }, (_, i) => <Bar key={i} element="el.mullion" size={[m, H - 2 * t, 0.05]} position={[-w / 2 + (i + 1) * pw + i * m + m / 2, H / 2, 0]} />)}
    </group>
  );
}

// ---------- Options : grille de sécurité et moustiquaire ----------
function Extras({ v, W, H, t }: { v: Viewable; W: number; H: number; t: number }) {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const x = c.getContext("2d")!;
    x.strokeStyle = "rgba(20,24,32,.55)";
    x.lineWidth = 1;
    x.strokeRect(0, 0, 16, 16);
    const tx = new THREE.CanvasTexture(c);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(((W - 2 * t) * 1000) / 4, ((H - 2 * t) * 1000) / 4);
    return tx;
  }, [W, H, t]);
  const w = W - 2 * t;
  const h = H - 2 * t;
  const nb = Math.max(3, Math.round(w / 0.14));
  return (
    <group position={[0, H / 2, 0.05]}>
      {v.extras.includes("moustiquaire") && tex && (
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      {v.extras.includes("grille") && (
        <>
          {Array.from({ length: nb - 1 }, (_, i) => (
            <mesh key={i} position={[-w / 2 + ((i + 1) * w) / nb, 0, 0.02]}>
              <cylinderGeometry args={[0.008, 0.008, h, 8]} />
              <meshStandardMaterial color="#20242b" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, w, 8]} />
            <meshStandardMaterial color="#20242b" metalness={0.7} roughness={0.35} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ---------- Décor (photos de démonstration) : mur, sol, fond de pièce ----------
export type Stage = { wall: string; ground: string; sky: string; interior?: string; sill?: number };

// Crépi : texture de bruit léger générée localement (aucun fichier), avec un générateur déterministe : le même crépi à chaque rendu.
function makePlaster(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 256);
  let seed = 20251;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)";
    x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const usePlaster = (color: string) => useMemo(() => (typeof document === "undefined" ? null : makePlaster(color)), [color]);

function Surroundings({ W, H, stage }: { W: number; H: number; stage: Stage }) {
  const sill = stage.sill ?? 0;
  const T = 0.3;
  const side = 3.4;
  const top = 1.5;
  const total = sill + H + top;
  const plaster = usePlaster(stage.wall);
  const mat = <meshStandardMaterial map={plaster ?? undefined} color={plaster ? "#ffffff" : stage.wall} roughness={0.95} />;
  const wall = (w: number, h: number, x: number, y: number) => (
    <mesh position={[x, y, -T / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, h, T]} />
      {mat}
    </mesh>
  );
  const bush = (x: number, z: number, r: number, c = "#3f6b3a") => (
    <mesh key={`${x}-${z}`} position={[x, r * 0.8, z]} castShadow receiveShadow>
      <sphereGeometry args={[r, 20, 16]} />
      <meshStandardMaterial color={c} roughness={1} />
    </mesh>
  );
  return (
    <group>
      {wall(side, total, -(W / 2 + side / 2), total / 2)}
      {wall(side, total, W / 2 + side / 2, total / 2)}
      {sill > 0 && wall(W, sill, 0, sill / 2)}
      {wall(W, top, 0, sill + H + top / 2)}
      {/* appui et linteau en saillie */}
      {sill > 0 && (
        <mesh position={[0, sill - 0.03, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.24, 0.06, 0.2]} />
          <meshStandardMaterial color="#cfc8ba" roughness={0.8} />
        </mesh>
      )}
      <mesh position={[0, sill + H + 0.07, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.7, 0.14, 0.32]} />
        <meshStandardMaterial color="#cfc8ba" roughness={0.8} />
      </mesh>
      {/* pièce derrière la vitre : plus sombre que l'extérieur, éclairée en chaud */}
      <mesh position={[0, 2.4, -1.7]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color={stage.interior ?? "#5f4d39"} roughness={1} />
      </mesh>
      <pointLight position={[0, sill + H * 0.7, -0.9]} intensity={1.3} distance={5} color="#ffd9a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 2]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={stage.ground} roughness={1} />
      </mesh>
      {bush(-(W / 2 + 0.9), 0.55, 0.5)}
      {bush(-(W / 2 + 1.7), 0.8, 0.35, "#4a7a42")}
      {bush(W / 2 + 1.1, 0.6, 0.45, "#386132")}
      <color attach="background" args={[stage.sky]} />
    </group>
  );
}

// ---------- Interaction ----------
function clickToggle(e: ThreeEvent<MouseEvent>, fn: () => void) {
  if (e.delta > 4) return; // un glisser pour tourner la vue n'ouvre rien
  e.stopPropagation();
  fn();
}
const pointer = (on: boolean) => () => {
  document.body.style.cursor = on ? "pointer" : "";
};

// Éclairage d'intérieur généré en local (aucun fichier téléchargé) pour de beaux reflets métalliques et dans le verre.
function Env() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  return <primitive object={env} attach="environment" />;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const useReducedMotion = () =>
  useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

function isMovable(v: Viewable) {
  if (v.category === "volet") return true;
  if (v.category !== "fenetre" && v.category !== "porte") return false;
  return v.opening !== "fixe";
}

// Quelles « parties mobiles » cliquables : un état d'ouverture (0 à 1) par vantail.
const countMovers = (v: Viewable) => (v.category === "volet" || v.opening === "jalousie" ? 1 : v.leaves);

export type View = { az: number; el: number; dist?: number }; // azimut et élévation en degrés, distance relative

export default function Viewer3D({ line, highlight = null, stage, bare = false, initialOpen = 0, view }: { line: Viewable; highlight?: string | null; stage?: Stage; bare?: boolean; initialOpen?: number; view?: View }) {
  const { t } = useI18n();
  const v = line;
  const n = countMovers(v);
  const [amounts, setAmounts] = useState<number[]>(() => Array(n).fill(initialOpen));
  const [mode, setMode] = useState<"turn" | "tilt">("turn");
  const reduced = useReducedMotion();
  const controls = useRef<{ reset: () => void; saveState: () => void } | null>(null);

  // la configuration change (autre nombre de vantaux…) : on repart fermé
  const sig = `${v.category}|${v.opening}|${v.leaves}|${v.shutter}`;
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    setAmounts(Array(n).fill(initialOpen));
  }

  const movable = isMovable(v);
  const mobileIdx = v.category === "fenetre" || v.category === "porte" ? (v.opening === "coulissant" ? [...Array(n).keys()].filter((i) => i % 2 === 1) : [...Array(n).keys()]) : [0];
  const mean = mobileIdx.length ? mobileIdx.reduce((s, i) => s + (amounts[i] ?? 0), 0) / mobileIdx.length : 0;
  const setAll = (x: number) => setAmounts((a) => a.map((_, i) => (mobileIdx.includes(i) ? x : 0)));
  const toggle = (i: number) => setAmounts((a) => a.map((x, j) => (j === i ? (x > 0.5 ? 0 : 1) : x)));

  const W = v.width / 1000;
  const H = v.height / 1000;
  const euro = v.range === "europeen";
  const tFrame = euro ? 0.065 : 0.05;
  const ctx = useMemo<Ctx>(() => {
    const base = GLASS[v.glassType] ?? GLASS.clair;
    return {
      hex: FINISHES.find((f) => f.id === v.finish)?.hex ?? "#f5f5f2",
      highlight,
      glass: v.pattern !== "none" ? { ...base, rough: 0.5, opacity: Math.min(0.9, base.opacity + 0.2) } : base,
      reduced,
    };
  }, [v.finish, v.glassType, v.pattern, highlight, reduced]);

  const dist = (Math.max(W, H) * 1.55 + 0.9) * (view?.dist ?? 1);
  const sillY = stage?.sill ?? 0;
  const cam: [number, number, number] = view
    ? [dist * Math.cos((view.el * Math.PI) / 180) * Math.sin((view.az * Math.PI) / 180), sillY + H / 2 + dist * Math.sin((view.el * Math.PI) / 180), dist * Math.cos((view.el * Math.PI) / 180) * Math.cos((view.az * Math.PI) / 180)]
    : [dist * 0.55, H * 0.55 + 0.4, dist];
  const open = mean > 0.5;

  let body: ReactNode;
  if (v.category === "volet") body = <Shutter v={v} W={W} H={H} amount={amounts[0] ?? 0} onToggle={() => toggle(0)} />;
  else if (v.category === "garde-corps") body = <Guard v={v} W={W} H={H} />;
  else if (v.category === "cloison") body = <Partition v={v} W={W} H={H} t={tFrame} />;
  else {
    const frame = <Dormant W={W} H={H} t={tFrame} depth={euro ? 0.09 : 0.07} />;
    if (v.opening === "fixe") body = <>{frame}<Pane w={W - 2 * tFrame} h={H - 2 * tFrame} position={[0, H / 2, 0]} /></>;
    else if (v.opening === "jalousie") body = <>{frame}<Louvre W={W} H={H} t={tFrame} amount={amounts[0] ?? 0} onToggle={() => toggle(0)} /></>;
    else if (v.opening === "coulissant") body = <>{frame}<Sliding v={v} W={W} H={H} t={tFrame} amounts={amounts} toggle={toggle} /></>;
    else body = <>{frame}<Casement v={v} W={W} H={H} t={tFrame} amounts={amounts} mode={mode} toggle={toggle} /></>;
    body = (
      <>
        {body}
        <Extras v={v} W={W} H={H} t={tFrame} />
      </>
    );
  }

  return (
    <div className={bare ? "h-full w-full" : "space-y-3"}>
      <div className={`relative overflow-hidden ${bare ? "h-full w-full" : "rounded-xl border border-line bg-gradient-to-b from-sky-100 to-slate-200 dark:from-slate-700 dark:to-slate-900"}`} style={bare ? undefined : { height: 380 }}>
        <Canvas shadows="percentage" scene={stage ? { environmentIntensity: 0.5 } : undefined} dpr={bare ? 1 : [1, 2]} frameloop="demand" camera={{ position: cam, fov: 32, near: 0.05, far: 80 }} aria-label={t("viewer.aria")} role="img" gl={{ antialias: true, preserveDrawingBuffer: bare }}>
          <SceneCtx.Provider value={ctx}>
            <Env />
            <ambientLight intensity={0.35} />
            <directionalLight position={[3, 5, 4]} intensity={stage ? 1.6 : 1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
            {stage && <Surroundings W={W} H={H} stage={stage} />}
            <group position={[0, sillY, 0]}>{body}</group>
            {!stage && <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={Math.max(W, H) * 2.4} blur={2.4} far={Math.max(H, 1.5)} />}
            <OrbitControls
              ref={(c) => {
                controls.current = c as unknown as typeof controls.current;
                c?.saveState();
              }}
              makeDefault
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              target={[0, sillY + H / 2, 0]}
              minDistance={0.6}
              maxDistance={dist * 2.2}
              maxPolarAngle={Math.PI * 0.52}
            />
          </SceneCtx.Provider>
        </Canvas>
        {!bare && <button type="button" className="absolute right-2 top-2 grid size-9 place-items-center rounded-lg bg-surface/90 text-ink shadow hover:bg-surface" onClick={() => controls.current?.reset()} aria-label={t("viewer.reset")} title={t("viewer.reset")}>
          <RotateCcw size={16} aria-hidden />
        </button>}
      </div>

      {bare ? null : movable ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button type="button" className="btn-primary" aria-pressed={open} onClick={() => setAll(open ? 0 : 1)}>
            {open ? t("viewer.close") : t("viewer.open")}
          </button>
          <label className="flex min-w-48 flex-1 items-center gap-3 text-sm">
            <span className="shrink-0 text-muted">{t("viewer.openness")}</span>
            <input type="range" min={0} max={100} value={Math.round(mean * 100)} onChange={(e) => setAll(Number(e.target.value) / 100)} className="h-2 w-full accent-[var(--primary)]" />
            <span className="w-10 shrink-0 text-right tabular-nums">{Math.round(mean * 100)} %</span>
          </label>
          {v.opening === "oscillo" && (
            <div role="group" aria-label={t("viewer.mode")} className="flex gap-1 rounded-full border border-line p-0.5">
              {(["turn", "tilt"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-9 rounded-full px-3 text-sm font-medium ${mode === m ? "bg-primary text-on-primary" : "text-muted hover:text-ink"}`}>
                  {t(m === "turn" ? "viewer.turn" : "viewer.tilt")}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("viewer.static")}</p>
      )}
      {!bare && <p className="text-xs text-muted">{t("viewer.hint")}</p>}
    </div>
  );
}
