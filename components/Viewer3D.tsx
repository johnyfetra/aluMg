"use client";
import { ContactShadows, Line as DLine, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { nacoBlades } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";
import { FINISHES, type Line, leafMarks, leafMotion, splitOf } from "@/lib/model";
import { rnd, type Room, type Stage, Surroundings } from "./Stage3D";

export type { Stage };

export type Viewable = Pick<Line, "category" | "opening" | "leaves" | "direction" | "leafCfg" | "shutter" | "control" | "guard" | "infill" | "finish" | "glassType" | "thickness" | "pattern" | "range" | "extras" | "width" | "height" | "splitAt">;

// ---------- Matériaux ----------
const GLASS: Record<string, { color: string; opacity: number; rough: number; metal: number }> = {
  clair: { color: "#c4e4f6", opacity: 0.3, rough: 0.03, metal: 0 },
  "teinte-bronze": { color: "#8a6a45", opacity: 0.5, rough: 0.05, metal: 0 },
  "teinte-gris": { color: "#5d6672", opacity: 0.5, rough: 0.05, metal: 0 },
  "teinte-vert": { color: "#4f7d63", opacity: 0.5, rough: 0.05, metal: 0 },
  reflechissant: { color: "#1b3d93", opacity: 0.85, rough: 0.02, metal: 0.95 }, // antélio bleu : miroir bleu profond
  feuillete: { color: "#bcd7f4", opacity: 0.35, rough: 0.05, metal: 0 },
  trempe: { color: "#cfe6ff", opacity: 0.28, rough: 0.05, metal: 0 },
  depoli: { color: "#ffffff", opacity: 0.8, rough: 0.9, metal: 0 },
};

type Ctx = { pattern: string; thickness: string; patTex: THREE.Texture | null; hex: string; metal: number; rough: number; hw: string; hwMetal: number; mapH: THREE.Texture | null; mapV: THREE.Texture | null; highlight: string | null; glass: (typeof GLASS)[string]; reduced: boolean; marks: boolean; size: number };
const SceneCtx = createContext<Ctx>({ pattern: "none", thickness: "5", patTex: null, hex: "#ffffff", metal: 0.25, rough: 0.46, hw: "#cdd2d8", hwMetal: 0.9, mapH: null, mapV: null, highlight: null, glass: GLASS.clair, reduced: false, marks: false, size: 1 });
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

// Quincaillerie (poignées, charnières) dans le ton du profilé : blanche sur du blanc, noire sur du noir ou de l'anthracite, noire sur du faux bois, sinon acier brossé.
const hardwareColor = (finish: string) => {
  const f = FINISHES.find((x) => x.id === finish);
  if (!f) return "#cdd2d8";
  if (f.group === "fauxbois") return "#1d1e21";
  if (finish === "blanc") return "#f3f3f1";
  if (finish === "noir" || finish === "anthracite") return "#1a1b1e";
  return "#cdd2d8";
};

// ---------- Pièces de base ----------
// Veinage du bois : stries claires et sombres dans le sens du fil, teintées par la couleur choisie (faux bois = aluminium décor bois).
function woodTexture(hex: string, vertical: boolean) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = hex;
  x.fillRect(0, 0, 256, 256);
  const r = rnd(vertical ? 31 : 17);
  for (let i = 0; i < 260; i++) {
    const dark = r() > 0.45;
    x.strokeStyle = dark ? `rgba(30,15,5,${0.06 + r() * 0.16})` : `rgba(255,230,190,${0.05 + r() * 0.1})`;
    x.lineWidth = 0.6 + r() * 1.8;
    const a = r() * 256;
    const b = r() * 256;
    const len = 60 + r() * 190;
    const w = (r() - 0.5) * 6;
    x.beginPath();
    if (vertical) {
      x.moveTo(a, b);
      x.quadraticCurveTo(a + w, b + len / 2, a, b + len);
    } else {
      x.moveTo(b, a);
      x.quadraticCurveTo(b + len / 2, a + w, b + len, a);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function ProfileMat({ vertical = false, hl = false, soft = 1 }: { vertical?: boolean; hl?: boolean; soft?: number }) {
  const { hex, metal, rough, mapH, mapV } = useScene();
  const map = vertical ? mapV : mapH;
  return <meshStandardMaterial color={map ? "#ffffff" : hex} map={map ?? undefined} metalness={metal * soft} roughness={rough} emissive={hl ? "#ff6a00" : "#000000"} emissiveIntensity={hl ? 0.9 : 0} />;
}

function Bar({ size, position, element, rotation }: { size: [number, number, number]; position: [number, number, number]; element: string; rotation?: [number, number, number] }) {
  const { highlight } = useScene();
  const [sx, sy, sz] = size;
  return (
    <RoundedBox args={size} radius={Math.min(0.004, Math.min(sx, sy) / 3, sz / 3)} smoothness={2} position={position} rotation={rotation} castShadow receiveShadow>
      <ProfileMat vertical={sy > sx} hl={highlight === element} />
    </RoundedBox>
  );
}

// Cadre à coupes d'onglet à 45° : quatre pièces biseautées qui se rejoignent en diagonale, comme un cadre assemblé ; un second anneau en relief donne la marche du profilé.
function miterPieces(w: number, h: number, t: number, depth: number) {
  const hw = w / 2;
  const hh = h / 2;
  const opts = { depth, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 1, curveSegments: 1 };
  const shapes: [number[][], boolean][] = [
    [[[-hw, hh], [hw, hh], [hw - t, hh - t], [-hw + t, hh - t]], false],
    [[[-hw, -hh], [-hw + t, -hh + t], [hw - t, -hh + t], [hw, -hh]], false],
    [[[-hw, hh], [-hw + t, hh - t], [-hw + t, -hh + t], [-hw, -hh]], true],
    [[[hw, hh], [hw, -hh], [hw - t, -hh + t], [hw - t, hh - t]], true],
  ];
  return shapes.map(([pts, vertical]) => {
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, opts);
    g.translate(0, 0, -depth / 2);
    return { g, vertical };
  });
}
function MiterRing({ w, h, t, depth, hEl, vEl, z = 0 }: { w: number; h: number; t: number; depth: number; hEl: string; vEl: string; z?: number }) {
  const { highlight } = useScene();
  const pieces = useMemo(() => miterPieces(w, h, t, depth), [w, h, t, depth]);
  return (
    <group position={[0, 0, z]}>
      {pieces.map(({ g, vertical }, i) => {
        const hl = highlight === (vertical ? vEl : hEl);
        return (
          <mesh key={i} geometry={g} castShadow receiveShadow>
            <ProfileMat vertical={vertical} hl={hl} />
          </mesh>
        );
      })}
    </group>
  );
}
function MiterFrame({ w, h, t, depth, hEl, vEl }: { w: number; h: number; t: number; depth: number; hEl: string; vEl: string }) {
  return (
    <group>
      <MiterRing w={w} h={h} t={t} depth={depth} hEl={hEl} vEl={vEl} />
      <MiterRing w={w - 0.56 * t} h={h - 0.56 * t} t={0.44 * t} depth={0.006} hEl={hEl} vEl={vEl} z={depth / 2 + 0.003} />
    </group>
  );
}

// Joint d'étanchéité noir qui borde le vitrage, bien visible comme sur une fenêtre posée.
function Gasket({ w, h, depth }: { w: number; h: number; depth: number }) {
  const g = 0.0055; // un vrai joint est fin : un liseré, pas un cadre noir
  const m = <meshStandardMaterial color="#202226" roughness={0.85} metalness={0} />;
  const d = depth * 0.4;
  return (
    <group>
      <mesh position={[0, h / 2 - g / 2, 0]}><boxGeometry args={[w, g, d]} />{m}</mesh>
      <mesh position={[0, -h / 2 + g / 2, 0]}><boxGeometry args={[w, g, d]} />{m}</mesh>
      <mesh position={[-w / 2 + g / 2, 0, 0]}><boxGeometry args={[g, h - 2 * g, d]} />{m}</mesh>
      <mesh position={[w / 2 - g / 2, 0, 0]}><boxGeometry args={[g, h - 2 * g, d]} />{m}</mesh>
    </group>
  );
}

// Texture du motif de verre (carreau répété) : sert de couleur et de relief, pour que granité, martelé, cathédrale et cannelé se voient en 3D.
function patternTexture(pattern: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = x.fillStyle = "rgba(15,23,42,.55)";
  x.lineWidth = 3;
  const r = rnd(7);
  if (pattern === "granite") for (let i = 0; i < 420; i++) { x.beginPath(); x.arc(r() * 128, r() * 128, 0.8 + r() * 1.6, 0, 7); x.fill(); }
  if (pattern === "martele") for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 12, 0, 7); x.stroke(); }
  if (pattern === "cathedrale") for (let j = 0; j < 8; j++) { x.beginPath(); for (let i = 0; i <= 128; i += 4) x.lineTo(i, 8 + j * 16 + Math.sin((i / 128) * Math.PI * 4) * 5); x.stroke(); }
  if (pattern === "cannele") for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(4 + i * 8, 0); x.lineTo(4 + i * 8, 128); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Verre : l'épaisseur choisie (4 à 10 mm) donne celle de la vitre ; un double vitrage (4/12/4) montre deux vitres séparées par la lame d'air.
// Le motif est porté par la vitre extérieure.
function Pane({ w, h, position, thick }: { w: number; h: number; position?: [number, number, number]; thick?: number }) {
  const { glass, thickness, patTex } = useScene();
  const tex = useMemo(() => {
    if (!patTex) return null;
    const t = patTex.clone();
    t.repeat.set(Math.max(1, w / 0.12), Math.max(1, h / 0.12));
    t.needsUpdate = true;
    return t;
  }, [patTex, w, h]);
  if (w <= 0.001 || h <= 0.001) return null;
  const [a, gap, b] = thickness.split("/").map((n) => Number(n) / 1000);
  const layers = thick ? [{ z: 0, t: thick, motif: true }] : gap ? [{ z: -(gap + a) / 2, t: a, motif: true }, { z: (gap + b) / 2, t: b, motif: false }] : [{ z: 0, t: a, motif: true }];
  return (
    <group position={position}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, 0, l.z]}>
          <boxGeometry args={[w, h, l.t]} />
          <meshPhysicalMaterial color={glass.color} map={l.motif ? tex : null} bumpMap={l.motif ? tex : null} bumpScale={1.5} transparent opacity={glass.opacity} roughness={glass.rough} metalness={glass.metal} clearcoat={1} clearcoatRoughness={0.03} depthWrite={false} envMapIntensity={glass.metal > 0.5 ? 3.2 : 1.8} />
        </mesh>
      ))}
    </group>
  );
}

function Panel({ w, h, position }: { w: number; h: number; position?: [number, number, number] }) {
  const depth = 0.02;
  const n = Math.max(0, Math.floor((h - 0.06) / 0.085)); // une lame environ tous les 8,5 cm : panneau à lames horizontales
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
        <ProfileMat soft={0.5} />
      </mesh>
      {([1, -1] as const).map((f) => (
        <group key={f} position={[0, 0, f * (depth / 2 + 0.0008)]}>
          {Array.from({ length: n }, (_, i) => (
            <mesh key={i} position={[0, -h / 2 + 0.03 + (i + 1) * ((h - 0.06) / (n + 1)), 0]}>
              <boxGeometry args={[Math.max(0.01, w - 0.02), 0.0032, 0.0016]} />
              <meshStandardMaterial color="#14161a" roughness={1} transparent opacity={0.55} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Corps d'un vantail centré sur l'origine : cadre (traverses, montants) + remplissage selon la catégorie.
// Étiquette dessinée dans la scène (sprite) : suit l'objet qui bouge, sans calque HTML.
function Label({ text, position, h }: { text: string; position: [number, number, number]; h: number }) {
  const made = useMemo(() => {
    if (typeof document === "undefined") return null;
    const font = "bold 40px Helvetica, Arial, sans-serif";
    const c = document.createElement("canvas");
    const x = c.getContext("2d")!;
    x.font = font;
    const w = Math.ceil(x.measureText(text).width) + 30;
    c.width = w;
    c.height = 64;
    x.font = font;
    x.fillStyle = "rgba(255,255,255,.96)";
    x.strokeStyle = "#334155";
    x.lineWidth = 3;
    x.beginPath();
    x.roundRect(2, 2, w - 4, 60, 10);
    x.fill();
    x.stroke();
    x.fillStyle = "#0f172a";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, aspect: w / 64 };
  }, [text]);
  useEffect(() => () => made?.tex.dispose(), [made]);
  if (!made) return null;
  return (
    <sprite position={position} scale={[h * made.aspect, h, 1]} renderOrder={10}>
      <spriteMaterial map={made.tex} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}

// Repère du vantail (V1, F1…).
function Tag({ text, y }: { text: string; y: number }) {
  const { marks, size } = useScene();
  if (!marks) return null;
  return <Label text={text} position={[0, y, 0.04]} h={0.04 + 0.05 * size} />;
}

function LeafBody({ w, h, v, infill, depth = 0.034, mark }: { w: number; h: number; v: Viewable; infill: Viewable["infill"]; depth?: number; mark?: string }) {
  const t = 0.04;
  const iw = w - 2 * t;
  const ih = h - 2 * t;
  const isDoor = v.category === "porte";
  const split = splitOf({ infill, splitAt: v.splitAt });
  return (
    <group>
      <MiterFrame w={w} h={h} t={t} depth={depth} hEl="el.sashH" vEl="el.sashV" />
      {isDoor && infill === "pleine" && <Panel w={iw} h={ih} />}
      {isDoor && infill === "semi" && (
        <>
          <group position={[0, ih * 0.5 - (ih * split) / 2, 0]}>
            <Pane w={iw} h={ih * split} />
            <Gasket w={iw} h={ih * split} depth={depth} />
          </group>
          <Bar element="el.mid" size={[iw, 0.04, depth]} position={[0, ih * 0.5 - ih * split, 0]} />
          <Panel w={iw} h={ih * (1 - split) - 0.04} position={[0, -ih * 0.5 + (ih * (1 - split)) / 2 - 0.02, 0]} />
        </>
      )}
      {isDoor && infill === "traverse" && (
        <>
          {/* traverse intermédiaire et deux vitrages, chacun avec son joint fin */}
          <Bar element="el.mid" size={[iw, 0.05, depth]} position={[0, ih * 0.5 - ih * split, 0]} />
          <group position={[0, ih * 0.5 - (ih * split) / 2, 0]}>
            <Pane w={iw} h={ih * split - 0.025} />
            <Gasket w={iw} h={ih * split - 0.025} depth={depth} />
          </group>
          <group position={[0, -ih * 0.5 + (ih * (1 - split)) / 2, 0]}>
            <Pane w={iw} h={ih * (1 - split) - 0.025} />
            <Gasket w={iw} h={ih * (1 - split) - 0.025} depth={depth} />
          </group>
        </>
      )}
      {!(isDoor && infill !== "vitree") && (
        <>
          <Pane w={iw} h={ih} />
          <Gasket w={iw} h={ih} depth={depth} />
        </>
      )}
      {mark && <Tag text={mark} y={h * 0.22} />}
    </group>
  );
}

function Handle({ position, kind = "grip", dir = 1 }: { position: [number, number, number]; kind?: "grip" | "lever" | "crem"; dir?: 1 | -1 }) {
  const { hw, hwMetal } = useScene();
  const metal = <meshStandardMaterial color={hw} metalness={hwMetal} roughness={hwMetal > 0.5 ? 0.25 : 0.45} />;
  if (kind === "grip")
    return (
      <group position={position}>
        {/* poignée encastrée d'un coulissant : plaque ovale dans le ton du profilé, fente noire au centre */}
        <RoundedBox args={[0.046, 0.15, 0.006]} radius={0.018} smoothness={3} castShadow><ProfileMat soft={0.6} /></RoundedBox>
        <RoundedBox args={[0.016, 0.085, 0.01]} radius={0.008} smoothness={3} position={[0, 0.004, 0.003]}><meshStandardMaterial color="#0c0d0f" roughness={0.7} /></RoundedBox>
      </group>
    );
  if (kind === "crem")
    return (
      <group position={position}>
        {/* crémone de fenêtre battante : rosace et poignée qui pend */}
        <RoundedBox args={[0.024, 0.12, 0.005]} radius={0.004} smoothness={2} castShadow>{metal}</RoundedBox>
        <RoundedBox args={[0.016, 0.085, 0.02]} radius={0.007} smoothness={2} position={[0, -0.035, 0.013]} castShadow>{metal}</RoundedBox>
        <RoundedBox args={[0.016, 0.02, 0.05]} radius={0.006} smoothness={2} position={[0, 0.006, 0.03]} castShadow>{metal}</RoundedBox>
      </group>
    );
  return (
    <group position={position}>
      {/* plaque, béquille horizontale tournée vers l'intérieur du vantail, barillet de serrure dessous */}
      <RoundedBox args={[0.032, 0.2, 0.006]} radius={0.003} smoothness={2} castShadow>{metal}</RoundedBox>
      <RoundedBox args={[0.12, 0.018, 0.016]} radius={0.006} smoothness={2} position={[dir * 0.045, 0.045, 0.014]} castShadow>{metal}</RoundedBox>
      <mesh position={[0, -0.04, 0.005]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.011, 0.011, 0.005, 20]} />{metal}</mesh>
      <mesh position={[0, -0.04, 0.0082]}><boxGeometry args={[0.003, 0.012, 0.001]} /><meshStandardMaterial color="#0d0f12" /></mesh>
    </group>
  );
}

// Paumelles : 2 ou 3 charnières métalliques sur le côté des gonds, avec leur axe (fiche) visible.
function Hinges({ h, x }: { h: number; x: number }) {
  const { hw, hwMetal } = useScene();
  const metal = <meshStandardMaterial color={hw} metalness={hwMetal} roughness={0.38} />;
  const ys = h > 1.2 ? [h / 2 - 0.2, 0, -h / 2 + 0.2] : [h / 2 - 0.15, -h / 2 + 0.15];
  return (
    <group position={[x, 0, 0.024]}>
      {ys.map((y) => (
        <group key={y} position={[0, y, 0]}>
          <RoundedBox args={[0.028, 0.1, 0.014]} radius={0.003} smoothness={2} castShadow>{metal}</RoundedBox>
          <mesh><cylinderGeometry args={[0.009, 0.009, 0.11, 14]} />{metal}</mesh>
        </group>
      ))}
    </group>
  );
}

// Dormant : cadre fixe autour de l'ouverture.
function Dormant({ W, H, t, depth, sliding = false }: { W: number; H: number; t: number; depth: number; sliding?: boolean }) {
  const dark = <meshStandardMaterial color="#101215" roughness={0.9} />;
  return (
    <group position={[0, H / 2, 0]}>
      <MiterFrame w={W} h={H} t={t} depth={depth} hEl="el.dormantH" vEl="el.dormantV" />
      {/* lumières d'évacuation de l'eau, en bas du dormant */}
      {[-0.28, 0.28].map((k) => <mesh key={k} position={[k * W, -H / 2 + t * 0.78, depth / 2 + 0.0062]}><boxGeometry args={[0.04, 0.004, 0.002]} />{dark}</mesh>)}
      {sliding && (
        <>
          {/* deux rails de guidage sur le dormant bas, gorge noire sous le dormant haut */}
          {[-0.016, 0.016].map((z) => (
            <RoundedBox key={z} args={[W - 2 * t, 0.014, 0.006]} radius={0.002} smoothness={2} position={[0, -H / 2 + t + 0.005, z]} castShadow>
              <meshStandardMaterial color="#b4bac2" metalness={0.85} roughness={0.3} />
            </RoundedBox>
          ))}
          <mesh position={[0, H / 2 - t - 0.0015, 0]}><boxGeometry args={[W - 2 * t, 0.003, depth * 0.55]} /><meshStandardMaterial color="#26282c" roughness={0.9} /></mesh>
        </>
      )}
    </group>
  );
}

// ---------- Fenêtres et portes coulissantes ----------
function SlideLeaf({ closedX, openX, z, w, h, v, target, side, mark, onToggle }: { closedX: number; openX: number; z: number; side: -1 | 1; mark: string; w: number; h: number; v: Viewable; target: number; onToggle: Grab }) {
  const g = useRef<THREE.Group>(null);
  useSpring(target, (x) => g.current && (g.current.position.x = THREE.MathUtils.lerp(closedX, openX, x)), v.category === "porte" ? 5.5 : 7);
  return (
    <group ref={g} position={[closedX, 0, z]} onPointerDown={onToggle} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      <LeafBody w={w} h={h} v={v} infill={v.infill} mark={mark} />
      <Handle position={[side * (w / 2 - 0.05), 0, z > 0 ? 0.02 : -0.02]} />
    </group>
  );
}

function Sliding({ v, W, H, t, amounts, bind }: { v: Viewable; W: number; H: number; t: number; amounts: number[]; bind: Bind }) {
  const n = v.leaves;
  const w = W - 2 * t;
  const h = H - 2 * t;
  const ov = 0.04;
  const lv = (w + (n - 1) * ov) / n;
  const x = (i: number) => -w / 2 + lv / 2 + i * (lv - ov);
  const motion = leafMotion(v);
  const marks = leafMarks(v);
  return (
    <group position={[0, H / 2, 0]}>
      {motion.map(({ slide, front, travel }, i) =>
        slide === 0 ? (
          <group key={i} position={[x(i), 0, front ? 0.016 : -0.016]}>
            <LeafBody w={lv} h={h} v={v} infill={v.infill} mark={marks[i]} />
          </group>
        ) : (
          <SlideLeaf key={i} closedX={x(i)} openX={x(i) + slide * travel * (lv - ov)} side={slide === 1 ? 1 : -1} mark={marks[i]} z={front ? 0.016 : -0.016} w={lv} h={h} v={v} target={amounts[i] ?? 0} onToggle={bind(i, "x", slide)} />
        ),
      )}
    </group>
  );
}

// ---------- Ouvrants : battant, oscillo-battant, soufflet ----------
function CasementLeaf({ hingeLeft, px, lv, h, v, mode, amount, mark, onToggle }: { hingeLeft: boolean; mark: string; px: number; lv: number; h: number; v: Viewable; mode: "turn" | "tilt"; amount: number; onToggle: Grab }) {
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
    <group ref={turn} position={[hx, 0, 0]} onPointerDown={onToggle} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      {/* origine = centre du vantail à la hauteur du pivot ; la rotation « tilt » tourne autour d'un axe horizontal passant par là */}
      <group position={[px - hx, pivotY, 0]}>
        <group ref={tilt}>
          <group position={[0, -pivotY, 0]}>
            <LeafBody w={lv} h={h} v={v} infill={v.infill} mark={mark} />
            <Handle kind={v.category === "porte" ? "lever" : "crem"} dir={side as 1 | -1} position={[-side * (lv / 2 - 0.05), 0, 0.02]} />
            <Hinges h={h} x={side * (lv / 2 - 0.004)} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Casement({ v, W, H, t, amounts, mode, bind }: { v: Viewable; W: number; H: number; t: number; amounts: number[]; mode: "turn" | "tilt"; bind: Bind }) {
  const n = v.leaves;
  const w = W - 2 * t;
  const h = H - 2 * t;
  const lv = w / n;
  const motion = leafMotion(v);
  const marks = leafMarks(v);
  return (
    <group position={[0, H / 2, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const { hingeLeft, fixed } = motion[i];
        const cx = -w / 2 + i * lv + lv / 2;
        if (fixed)
          return (
            <group key={i} position={[cx, 0, 0]}>
              <LeafBody w={lv - 0.004} h={h - 0.004} v={v} infill={v.infill} mark={marks[i]} />
            </group>
          );
        return <CasementLeaf key={i} hingeLeft={hingeLeft} mark={marks[i]} px={cx} lv={lv - 0.004} h={h - 0.004} v={v} mode={mode} amount={amounts[i] ?? 0} onToggle={bind(i, v.opening === "soufflet" ? "y" : "x", v.opening === "soufflet" ? 1 : hingeLeft ? -1 : 1)} />;
      })}
      {n >= 2 && Array.from({ length: Math.floor(n / 2) }, (_, k) => <Bar key={k} element="el.battement" size={[0.03, h, 0.026]} position={[-w / 2 + (2 * k + 1) * lv, 0, -0.018]} />)}
    </group>
  );
}

// ---------- Naco : lames de verre qui basculent ----------
function Louvre({ W, H, t, amount, onToggle }: { W: number; H: number; t: number; amount: number; onToggle: Grab }) {
  const slats = useRef<THREE.Group>(null);
  const crank = useRef<THREE.Group>(null);
  const k = nacoBlades(H * 1000);
  const h = H - 2 * t;
  const w = W - 2 * t - 0.08;
  // les lames basculent ; la manivelle fait un tour complet entre fermé et ouvert
  useSpring(
    amount,
    (x) => {
      slats.current?.children.forEach((c) => (c.rotation.x = x * 1.15));
      if (crank.current) crank.current.rotation.z = -x * Math.PI * 2;
    },
    6,
  );
  const steel = <meshStandardMaterial color="#b9bec6" metalness={0.9} roughness={0.28} />;
  const rx = W / 2 - t - 0.02; // axe du montant de droite : la commande y est fixée
  return (
    <group position={[0, H / 2, 0]} onPointerDown={onToggle} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      <Bar element="el.louvre" size={[0.04, h, 0.04]} position={[-W / 2 + t + 0.02, 0, 0]} />
      <Bar element="el.louvre" size={[0.04, h, 0.04]} position={[rx, 0, 0]} />
      <group ref={slats}>
        {Array.from({ length: k }, (_, i) => (
          <group key={i} position={[0, -h / 2 + (h * (i + 0.5)) / k, 0]}>
            <Pane w={w} h={Math.min(0.1, h / k) * 0.98} />
          </group>
        ))}
      </group>
      {/* tringle de commande : relie toutes les lames, une rotule par lame */}
      <mesh position={[rx, 0, 0.03]}><boxGeometry args={[0.006, h - 0.02, 0.006]} />{steel}</mesh>
      {Array.from({ length: k }, (_, i) => (
        <mesh key={i} position={[rx, -h / 2 + (h * (i + 0.5)) / k, 0.03]}><sphereGeometry args={[0.0075, 10, 8]} />{steel}</mesh>
      ))}
      {/* manivelle : embase, bras et pommeau, en bas du montant */}
      <group position={[rx, -h / 2 + 0.11, 0.03]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.026, 0.026, 0.01, 28]} /><meshStandardMaterial color="#15171b" roughness={0.6} metalness={0.4} /></mesh>
        <group ref={crank} position={[0, 0, 0.008]}>
          <RoundedBox args={[0.085, 0.012, 0.008]} radius={0.003} smoothness={2} position={[-0.036, 0, 0]} castShadow>{steel}</RoundedBox>
          <mesh position={[-0.076, 0, 0.012]} castShadow><sphereGeometry args={[0.016, 18, 14]} /><meshStandardMaterial color="#14161a" roughness={0.45} metalness={0.3} /></mesh>
        </group>
      </group>
    </group>
  );
}

// ---------- Volets : roulant et rideau métallique ----------
function Shutter({ v, W, H, amount, onToggle }: { v: Viewable; W: number; H: number; amount: number; onToggle: Grab }) {
  const { highlight } = useScene();
  const rideau = v.shutter === "rideau";
  const pitch = rideau ? 0.07 : 0.037;
  const count = Math.ceil(H / pitch);
  const boxH = 0.2;
  const slats = useRef<THREE.Group>(null);
  const last = useRef<THREE.Group>(null);
  const el = rideau ? "el.slatR" : "el.slat";
  // les lames remontent dans le caisson de bas en haut : au-delà de la longueur déroulée, elles disparaissent
  useSpring(amount, (x) => {
    const unrolled = (H - boxH) * (1 - x);
    slats.current?.children.forEach((c, i) => (c.visible = (i + 1) * pitch <= unrolled));
    if (last.current) last.current.position.y = H - boxH - unrolled;
  }, 4.5);
  const hl = highlight === el;
  const steel = <meshStandardMaterial color="#7d848d" metalness={0.7} roughness={0.35} />;
  const gl = H - boxH; // hauteur des coulisses
  const channel = (x: number, sign: 1 | -1) => (
    <group key={x} position={[x, gl / 2, 0]}>
      {/* coulisse en U : fond et deux ailes, dans le ton du profilé */}
      <Bar element="el.guide" size={[0.05, gl, 0.012]} position={[0, 0, -0.024]} />
      <Bar element="el.guide" size={[0.01, gl, 0.06]} position={[sign * 0.02, 0, 0]} />
      <Bar element="el.guide" size={[0.01, gl, 0.06]} position={[-sign * 0.02, 0, 0]} />
    </group>
  );
  return (
    <group onPointerDown={onToggle} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      {/* coffre en saillie au-dessus de la baie, avec sa trappe de visite */}
      <Bar element="el.box" size={[W + 0.04, boxH, 0.22]} position={[0, H - boxH / 2, 0.01]} />
      <mesh position={[0, H - boxH / 2, 0.123]}><boxGeometry args={[W - 0.1, 0.004, 0.002]} /><meshStandardMaterial color="#14161a" transparent opacity={0.5} /></mesh>
      {rideau && (
        <mesh position={[0, H - boxH / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, W - 0.02, 24]} />
          <meshStandardMaterial color="#8d949e" metalness={0.7} roughness={0.35} emissive={highlight === "el.shaft" ? "#ff6a00" : "#000"} emissiveIntensity={highlight === "el.shaft" ? 0.9 : 0} />
        </mesh>
      )}
      {channel(-W / 2 + 0.025, 1)}
      {channel(W / 2 - 0.025, -1)}
      <group ref={slats}>
        {Array.from({ length: Math.max(0, count - 1) }, (_, i) => (
          <RoundedBox key={i} args={[W - 0.08, pitch * 0.9, rideau ? 0.016 : 0.014]} radius={pitch * 0.3} smoothness={3} position={[0, H - boxH - (i + 0.5) * pitch, 0]} castShadow>
            <ProfileMat soft={0.9} hl={hl} />
          </RoundedBox>
        ))}
      </group>
      {/* lame finale plus haute, avec ses butées en caoutchouc */}
      <group ref={last} position={[0, H - boxH, 0]}>
        <RoundedBox args={[W - 0.06, 0.05, 0.03]} radius={0.01} smoothness={3} castShadow><ProfileMat soft={0.9} /></RoundedBox>
        {[-1, 1].map((k) => <mesh key={k} position={[k * (W / 2 - 0.05), 0.0, 0.02]}><boxGeometry args={[0.04, 0.03, 0.01]} /><meshStandardMaterial color="#15171a" roughness={0.9} /></mesh>)}
      </group>
      {v.control === "motorise" && (
        <mesh position={[W / 2 + 0.04, H - boxH / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 20]} />
          {steel}
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
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[-w / 2 + pw / 2 + i * (pw + m), H / 2, 0]}>
          <Pane w={pw} h={H - 2 * t} />
          <Tag text={`P${i + 1}`} y={(H - 2 * t) * 0.22} />
        </group>
      ))}
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
// ---------- Cotes : la largeur et la hauteur réelles, suivent la vue ----------
function Dimensions({ W, H, leaves }: { W: number; H: number; leaves: number }) {
  const y = -0.1;
  const x = -W / 2 - 0.12;
  const col = "#64748b";
  const h = 0.04 + 0.05 * Math.max(W, H);
  return (
    <group>
      <DLine points={[[-W / 2, y, 0.05], [W / 2, y, 0.05]]} color={col} lineWidth={1} />
      <DLine points={[[x, 0, 0.05], [x, H, 0.05]]} color={col} lineWidth={1} />
      <Label text={`${Math.round(W * 1000)} mm${leaves > 1 ? ` · ${leaves} × ${Math.round((W * 1000) / leaves)}` : ""}`} position={[0, y - h, 0.05]} h={h} />
      <Label text={`${Math.round(H * 1000)}`} position={[x, H / 2, 0.05]} h={h} /> {/* centrée sur la cote : une étiquette plus large sortirait du cadre */}
    </group>
  );
}

// ---------- Interaction ----------
// Un geste sur une partie mobile : un simple clic la bascule (ouverte/fermée), un glisser l'ouvre ou la ferme progressivement. axis : sens du glisser, sign : sens qui ouvre.
type Grab = (e: ThreeEvent<PointerEvent>) => void;
type Bind = (i: number, axis: "x" | "y", sign: number) => Grab;
// Survol d'une partie mobile : la vue le sait par un événement (le curseur de la vue dépend aussi du mode et du glisser en cours).
const pointer = (on: boolean) => () => {
  window.dispatchEvent(new CustomEvent("alumg-3d-hover", { detail: on }));
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

// Environnement extérieur pour les reflets du vitrage : ciel dégradé, sol, immeubles en face. Un verre réfléchissant (antélio bleu) montre la rue, comme sur un vrai chantier.
function OutdoorEnv() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const sc = new THREE.Scene();
    sc.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(60, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
          fragmentShader: "varying vec3 p; void main(){ float h = p.y; vec3 top = vec3(0.16, 0.4, 0.92); vec3 hor = vec3(0.86, 0.92, 1.0); vec3 gnd = vec3(0.45, 0.4, 0.34); vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor * 0.7, gnd, min(1.0, -h * 3.0)); gl_FragColor = vec4(c, 1.0); }",
        }),
      ),
    );
    // façades en face de l'ouvrage (côté +z) et un poteau : des formes nettes à refléter
    [[-14, 7, 26, 9, 14, "#d8d1c4"], [-3, 5, 28, 8, 10, "#bdb5a8"], [8, 8, 27, 10, 16, "#e4ded1"], [20, 4, 25, 7, 8, "#c9c1b3"], [2, 3, 20, 0.5, 6, "#3a3d42"]].forEach(([x, y, z, w, h, c]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w as number, h as number, 4), new THREE.MeshBasicMaterial({ color: c as string }));
      m.position.set(x as number, y as number, z as number);
      sc.add(m);
    });
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(sc, 0.01).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  return <primitive object={env} attach="environment" />;
}

// Couleurs de mur courantes (crépi, peinture) pour voir l'ouvrage posé sur le mur du client ; le choix libre reste possible. Le choix est gardé dans ce navigateur.
const WALLS = [["white", "#efe9df"], ["beige", "#d9c8b4"], ["grey", "#b5b5b3"], ["sand", "#d8c39a"], ["ochre", "#d9ae63"], ["terracotta", "#c4795f"], ["rose", "#d9a79b"], ["sage", "#a3b79e"], ["blue", "#97b4cc"], ["anthracite", "#4b4e53"]] as const;
const WALL_KEY = "alumg.wall";
const readWall = () => {
  try {
    const w = localStorage.getItem(WALL_KEY);
    return w && /^#[0-9a-f]{6}$/i.test(w) ? w : null;
  } catch {
    return null;
  }
};
function WallPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("viewer.wall")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{t("viewer.wall")}</span>
      {WALLS.map(([k, hex]) => (
        <button key={k} type="button" aria-pressed={value.toLowerCase() === hex} title={t(`wall.${k}`)} aria-label={t(`wall.${k}`)} onClick={() => onChange(hex)} className="size-8 rounded-full border border-line ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-primary" style={{ background: hex }} />
      ))}
      <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={t("viewer.wallCustom")} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
        {t("viewer.wallCustom")}
      </label>
    </div>
  );
}

function RoomPicker({ value, onChange }: { value: Room; onChange: (r: Room) => void }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("viewer.room")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{t("viewer.room")}</span>
      {(["living", "kitchen", "shower"] as const).map((r) => (
        <button key={r} type="button" aria-pressed={value === r} onClick={() => onChange(r)} className="min-h-8 rounded-full border border-line px-3 text-xs font-medium hover:bg-surface-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary">
          {t(`room.${r}`)}
        </button>
      ))}
    </div>
  );
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
  return v.opening !== "fixe" && (v.opening === "jalousie" || leafMotion(v).some((m) => !m.fixed));
}

// Quelles « parties mobiles » cliquables : un état d'ouverture (0 à 1) par vantail.
const countMovers = (v: Viewable) => (v.category === "volet" || v.opening === "jalousie" ? 1 : v.leaves);

// Fond de la vue : toujours en contraste avec la couleur du profilé, quel que soit le thème de l'app
// (profilé sombre → fond clair ; profilé clair → fond sombre ; teinte moyenne → gris neutre).
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
export const backdropFor = (hex: string) => {
  const l = luminance(hex);
  return l < 0.12 ? "linear-gradient(180deg,#f4f4f5,#d4d4d8)" : l > 0.55 ? "linear-gradient(180deg,#52525b,#27272a)" : "linear-gradient(180deg,#e4e4e7,#a1a1aa)";
};

type Ctl = { reset: () => void; saveState: () => void; object: THREE.Camera; target: THREE.Vector3; update: () => void };
export type View = { az: number; el: number; dist?: number }; // azimut et élévation en degrés, distance relative

// dims : cotes et repères (F1, V1…) ; par défaut seulement hors décor, pour ne pas charger les rendus d'ambiance.
export default function Viewer3D({ line, highlight = null, stage: baseStage, bare = false, initialOpen = 0, view, dims }: { line: Viewable; highlight?: string | null; stage?: Stage; bare?: boolean; initialOpen?: number; view?: View; dims?: boolean }) {
  const { t } = useI18n();
  // couleur du mur choisie (éditeur et vue du client seulement, pas les rendus d'ambiance) : mémorisée dans le navigateur
  const picker = !!baseStage && !!dims && !bare;
  const [wall, setWall] = useState<string | null>(() => (picker ? readWall() : null));
  const stage = useMemo(() => (baseStage && wall ? { ...baseStage, wall } : baseStage), [baseStage, wall]);
  const [roomPick, setRoomPick] = useState<Room | null>(null);
  const room: Room = roomPick ?? (line.opening === "jalousie" ? "shower" : "living"); // un naco s'ouvre d'abord sur une salle d'eau
  const chooseWall = (hex: string) => {
    setWall(hex);
    try {
      localStorage.setItem(WALL_KEY, hex);
    } catch {}
  };
  const v = line;
  const n = countMovers(v);
  const [amounts, setAmounts] = useState<number[]>(() => Array(n).fill(initialOpen));
  const [mode, setMode] = useState<"turn" | "tilt">("turn");
  const reduced = useReducedMotion();
  const controls = useRef<Ctl | null>(null);
  const [rotating, setRotating] = useState(false); // clic droit ou Maj : la vue tourne au lieu de se déplacer
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setHover((e as CustomEvent<boolean>).detail);
    const up = () => setDrag(false);
    window.addEventListener("alumg-3d-hover", on);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("alumg-3d-hover", on);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  // la configuration change (autre nombre de vantaux…) : on repart fermé
  const sig = `${v.category}|${v.opening}|${v.leaves}|${v.shutter}|${v.direction}|${v.leafCfg?.join("")}`;
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    setAmounts(Array(n).fill(initialOpen));
  }

  const movable = isMovable(v);
  const mobileIdx = v.category === "fenetre" || v.category === "porte" ? (v.opening === "jalousie" ? [0] : [...Array(n).keys()].filter((i) => !leafMotion(v)[i].fixed)) : [0];
  const mean = mobileIdx.length ? mobileIdx.reduce((s, i) => s + (amounts[i] ?? 0), 0) / mobileIdx.length : 0;
  const setAll = (x: number) => setAmounts((a) => a.map((_, i) => (mobileIdx.includes(i) ? x : 0)));
  const amountsRef = useRef(amounts);
  useEffect(() => {
    amountsRef.current = amounts;
  }, [amounts]);
  const gesture = useRef<{ i: number; axis: "x" | "y"; sign: number; x0: number; y0: number; a0: number; moved: boolean } | null>(null);
  const [grab, setGrab] = useState<"x" | "y" | null>(null);
  const start = useCallback((i: number, axis: "x" | "y", sign: number, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    gesture.current = { i, axis, sign, x0: e.nativeEvent.clientX, y0: e.nativeEvent.clientY, a0: amountsRef.current[i] ?? 0, moved: false };
    if (controls.current) (controls.current as unknown as { enabled: boolean }).enabled = false; // la vue ne bouge pas pendant qu'on manœuvre l'ouvrage
    setGrab(axis);
  }, []);
  const bind: Bind = (i, axis, sign) => (e) => start(i, axis, sign, e);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const d = (g.axis === "x" ? e.clientX - g.x0 : e.clientY - g.y0) * g.sign;
      if (Math.abs(d) > 4) g.moved = true;
      if (!g.moved) return;
      const a = Math.min(1, Math.max(0, g.a0 + d / 220)); // 220 px de glisser pour une course complète
      setAmounts((arr) => arr.map((x, j) => (j === g.i ? a : x)));
    };
    const up = () => {
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      if (!g.moved) setAmounts((arr) => arr.map((x, j) => (j === g.i ? (x > 0.5 ? 0 : 1) : x)));
      if (controls.current) (controls.current as unknown as { enabled: boolean }).enabled = true;
      setGrab(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const W = v.width / 1000;
  const H = v.height / 1000;
  const euro = v.range === "europeen";
  const tFrame = euro ? 0.065 : 0.05;
  const finishDef = FINISHES.find((f) => f.id === v.finish);
  const wood = useMemo(() => (finishDef?.group === "fauxbois" && typeof document !== "undefined" ? [woodTexture(finishDef.hex, false), woodTexture(finishDef.hex, true)] : null), [finishDef]);
  const ctx = useMemo<Ctx>(() => {
    const base = GLASS[v.glassType] ?? GLASS.clair;
    return {
      pattern: v.pattern,
      thickness: v.thickness,
      patTex: v.pattern !== "none" && typeof document !== "undefined" ? patternTexture(v.pattern) : null,
      hex: FINISHES.find((f) => f.id === v.finish)?.hex ?? "#f5f5f2",
      hw: hardwareColor(v.finish),
      hwMetal: hardwareColor(v.finish) === "#cdd2d8" ? 0.9 : 0.15, // acier brossé, ou laqué dans le ton du profilé
      mapH: wood?.[0] ?? null,
      mapV: wood?.[1] ?? null,
      metal: FINISHES.find((f) => f.id === v.finish)?.group === "anodise" ? 0.85 : 0.22, // laqué : mat ; anodisé : métal brillant
      rough: FINISHES.find((f) => f.id === v.finish)?.group === "anodise" ? 0.3 : 0.46,
      highlight,
      glass: v.pattern !== "none" ? { ...base, rough: 0.5, opacity: Math.min(0.9, base.opacity + 0.2) } : base,
      reduced,
      marks: !bare && (dims ?? !stage),
      size: Math.max(v.width, v.height) / 1000,
    };
  }, [v.finish, v.glassType, v.pattern, v.thickness, highlight, reduced, bare, stage, dims, v.width, v.height, wood]);

  const dist = (Math.max(W, H) * 1.55 + 0.9) * (view?.dist ?? 1) * (bare || (stage && !dims) ? 1 : 1.12); // un peu de recul pour les cotes (plus dans un décor, pour voir aussi le mur)
  const sillY = stage?.sill ?? 0;
  const cam: [number, number, number] = view
    ? [dist * Math.cos((view.el * Math.PI) / 180) * Math.sin((view.az * Math.PI) / 180), sillY + H / 2 + dist * Math.sin((view.el * Math.PI) / 180), dist * Math.cos((view.el * Math.PI) / 180) * Math.cos((view.az * Math.PI) / 180)]
    : [dist * 0.55, H * 0.55 + 0.4, dist];
  const open = mean > 0.5;
  const target = useMemo<[number, number, number]>(() => [0, sillY + H / 2, 0], [sillY, H]);

  let body: ReactNode;
  if (v.category === "volet") body = <Shutter v={v} W={W} H={H} amount={amounts[0] ?? 0} onToggle={bind(0, "y", -1)} />;
  else if (v.category === "garde-corps") body = <Guard v={v} W={W} H={H} />;
  else if (v.category === "cloison") body = <Partition v={v} W={W} H={H} t={tFrame} />;
  else {
    const frame = <Dormant W={W} H={H} t={tFrame} depth={euro ? 0.09 : 0.07} sliding={v.opening === "coulissant"} />;
    if (v.opening === "fixe") body = <>{frame}<group position={[0, H / 2, 0]}><Pane w={W - 2 * tFrame} h={H - 2 * tFrame} /><Tag text="F1" y={(H - 2 * tFrame) * 0.22} /></group></>;
    else if (v.opening === "jalousie") body = <>{frame}<Louvre W={W} H={H} t={tFrame} amount={amounts[0] ?? 0} onToggle={bind(0, "y", -1)} /></>;
    else if (v.opening === "coulissant") body = <>{frame}<Sliding v={v} W={W} H={H} t={tFrame} amounts={amounts} bind={bind} /></>;
    else body = <>{frame}<Casement v={v} W={W} H={H} t={tFrame} amounts={amounts} mode={mode} bind={bind} /></>;
    body = (
      <>
        {body}
        <Extras v={v} W={W} H={H} t={tFrame} />
      </>
    );
  }

  return (
    <div className={bare ? "h-full w-full" : "space-y-3"}>
      <div className={`relative overflow-hidden ${bare ? "h-full w-full" : "rounded-xl border border-line"}`} style={bare ? undefined : { height: 440, background: backdropFor(ctx.hex), cursor: grab ? (grab === "x" ? "ew-resize" : "ns-resize") : hover ? "pointer" : drag ? (rotating ? "grabbing" : "move") : "grab", touchAction: "none" }} onPointerDown={(e) => { setDrag(true); setRotating(e.button === 0 && !(e.shiftKey || e.ctrlKey || e.metaKey)); }} onContextMenu={(e) => e.preventDefault()} onDoubleClick={() => controls.current?.reset()}>
        <Canvas shadows="percentage" scene={stage ? { environmentIntensity: 0.85 } : undefined} dpr={bare ? 1 : [1, 2]} frameloop="demand" camera={{ position: cam, fov: 32, near: 0.05, far: 80 }} aria-label={t("viewer.aria")} role="img" gl={{ antialias: true, preserveDrawingBuffer: bare }}>
          <SceneCtx.Provider value={ctx}>
            {stage ? <OutdoorEnv /> : <Env />}
            <ambientLight intensity={0.35} />
            <directionalLight position={[3, 5, 4]} intensity={stage ? 1.6 : 1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
            {stage && <Surroundings W={W} H={H} stage={stage} room={picker ? room : undefined} />}
            <group position={[0, sillY, 0]}>{body}</group>
            {!bare && (dims ?? !stage) && <Dimensions W={W} H={H} leaves={v.category === "fenetre" || v.category === "porte" || v.category === "cloison" ? v.leaves : 1} />}
            {!stage && <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={Math.max(W, H) * 2.4} blur={2.4} far={Math.max(H, 1.5)} />}
            <OrbitControls
              ref={(c) => {
                controls.current = c as unknown as Ctl | null;
                c?.saveState();
              }}
              makeDefault
              enablePan={!bare}
              screenSpacePanning
              enableDamping
              dampingFactor={0.08}
              target={target}
              minDistance={0.3}
              maxDistance={dist * 4}
              mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} // clic gauche maintenu : rotation 360° ; Maj/Ctrl + glisser (ou clic droit) : déplacement
              touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
              minPolarAngle={0.02}
              maxPolarAngle={Math.PI * (stage ? 0.6 : 0.98)}
            />
          </SceneCtx.Provider>
        </Canvas>
      </div>

      {picker && stage && (
        <div className="space-y-2">
          <WallPicker value={stage.wall} onChange={chooseWall} />
          <RoomPicker value={room} onChange={setRoomPick} />
        </div>
      )}

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
