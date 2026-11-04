"use client";
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

// Décor de la vue 3D : façade en crépi, jardin (pelouse tondue, haies, arbres, terrasse) et pièces intérieures meublées (salon, cuisine, douche).
// Tout est généré en local (textures canvas, formes simples) : aucun fichier téléchargé.

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

// Textures procédurales (aucun fichier) : herbe, parquet, carrelage.
function canvasTex(draw: (x: CanvasRenderingContext2D) => void, rx: number, ry: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const rnd = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const grassTex = () =>
  canvasTex((x) => {
    const r = rnd(7);
    // bandes de tonte : une bande claire, une bande foncée, qui courent vers le spectateur
    x.fillStyle = "#5f9645";
    x.fillRect(0, 0, 128, 256);
    x.fillStyle = "#528a3b";
    x.fillRect(128, 0, 128, 256);
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = ["#4a7d36", "#6ba24c", "#5b9142", "#78ad57"][Math.floor(r() * 4)];
      x.fillRect(r() * 256, r() * 256, 1, 2 + r() * 3);
    }
  }, 70, 70);
const woodTex = () =>
  canvasTex((x) => {
    const r = rnd(11);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = ["#a9845b", "#9c764d", "#b38d63", "#a07a52"][Math.floor(r() * 4)];
      x.fillRect(0, i * 32, 256, 32);
      x.fillStyle = "rgba(40,25,10,.35)";
      x.fillRect(0, i * 32, 256, 1.5);
      x.fillRect(r() * 256, i * 32, 1.5, 32);
    }
  }, 3, 3);
const tileTex = (base: string, grout: string, n = 4) =>
  canvasTex((x) => {
    x.fillStyle = base;
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = grout;
    const s = 256 / n;
    for (let i = 0; i < n; i++) {
      x.fillRect(i * s, 0, 2, 256);
      x.fillRect(0, i * s, 256, 2);
    }
  }, 5, 4);
const usePlasterFor = (color: string, reach: number, high: number, W: number, sill: number, topH: number) =>
  useMemo(() => {
    if (typeof document === "undefined") return null;
    const base = makePlaster(color);
    // un grain de crépi d'environ 70 cm quelle que soit la taille du pan de mur
    return ([[reach, high], [W, Math.max(sill, 0.01)], [W, topH]] as const).map(([w, h]) => {
      const t = base.clone();
      t.repeat.set(w / 0.7, h / 0.7);
      t.needsUpdate = true;
      return t;
    });
  }, [color, reach, high, W, sill, topH]);

// Mobilier : parallélépipèdes et cylindres simples mais proportionnés, pour donner l'échelle d'une vraie pièce.
function Box({ s, p, c, r = 0.7, m = 0, round = 0, e, opacity }: { s: [number, number, number]; p: [number, number, number]; c: string; r?: number; m?: number; round?: number; e?: string; opacity?: number }) {
  const mat = <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? "#000"} emissiveIntensity={e ? 1.2 : 0} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
  return round ? (
    <RoundedBox args={s} radius={round} smoothness={3} position={p} castShadow receiveShadow>{mat}</RoundedBox>
  ) : (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      {mat}
    </mesh>
  );
}
function Cyl({ r, h, p, c, rb, rough = 0.6, m = 0, e }: { r: number; h: number; p: [number, number, number]; c: string; rb?: number; rough?: number; m?: number; e?: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, rb ?? r, h, 24]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={m} emissive={e ?? "#000"} emissiveIntensity={e ? 1.4 : 0} />
    </mesh>
  );
}
function Ball({ r, p, c, e }: { r: number; p: [number, number, number]; c: string; e?: string }) {
  return (
    <mesh position={p} castShadow>
      <sphereGeometry args={[r, 20, 14]} />
      <meshStandardMaterial color={c} roughness={0.9} emissive={e ?? "#000"} emissiveIntensity={e ? 1.5 : 0} />
    </mesh>
  );
}

export type Room = "living" | "kitchen" | "shower";
const RW = 6.4;
const RD = 4.6;
const RH = 2.75;
const Z0 = -0.3; // face intérieure du mur de façade

// Pièce derrière la vitre : sol, murs, plafond, lumière chaude et mobilier élégant.
function Interior({ kind, accent }: { kind: Room; accent: string }) {
  const floorTex = useMemo(() => (typeof document === "undefined" ? null : kind === "living" ? woodTex() : kind === "kitchen" ? tileTex("#d9d2c4", "#bdb5a4", 4) : tileTex("#d7dadc", "#b7bcc0", 4)), [kind]);
  const wallTex = useMemo(() => (typeof document === "undefined" || kind !== "shower" ? null : tileTex("#e4e7e8", "#c3c8cb", 4)), [kind]);
  const wall = kind === "shower" ? "#ffffff" : kind === "kitchen" ? "#eee9df" : "#efe7da";
  const wallMat = <meshStandardMaterial map={wallTex ?? undefined} color={wall} roughness={kind === "shower" ? 0.35 : 1} />;
  const zc = Z0 - RD / 2;
  const zb = Z0 - RD;
  const light = kind === "living" ? "#ffddb0" : kind === "kitchen" ? "#fff0d4" : "#f4efe8";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, zc]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial map={floorTex ?? undefined} color="#ffffff" roughness={kind === "living" ? 0.55 : 0.3} />
      </mesh>
      <mesh position={[0, RH / 2, zb]}><planeGeometry args={[RW, RH]} />{wallMat}</mesh>
      <mesh position={[-RW / 2, RH / 2, zc]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[RD, RH]} />{wallMat}</mesh>
      <mesh position={[RW / 2, RH / 2, zc]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[RD, RH]} />{wallMat}</mesh>
      <mesh position={[0, RH, zc]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[RW, RD]} /><meshStandardMaterial color="#f7f4ee" roughness={1} /></mesh>
      <pointLight position={[0, 2.3, Z0 - 1.6]} intensity={kind === "shower" ? 3.2 : 2.6} distance={9} color={light} />
      <pointLight position={[0, 1.6, Z0 - 0.4]} intensity={0.9} distance={5} color={light} />
      {kind === "living" && (
        <group>
          <Box s={[3, 0.015, 2]} p={[0, 0.012, zb + 2.4]} c="#cdbfa6" r={1} />
          {/* canapé : assise, dossier, accoudoirs, coussins */}
          <Box s={[2.3, 0.42, 0.95]} p={[0, 0.21, zb + 0.6]} c="#6c7884" round={0.07} />
          <Box s={[2.3, 0.55, 0.22]} p={[0, 0.69, zb + 0.18]} c="#6c7884" round={0.07} />
          <Box s={[0.22, 0.62, 0.95]} p={[-1.14, 0.31, zb + 0.6]} c="#617080" round={0.07} />
          <Box s={[0.22, 0.62, 0.95]} p={[1.14, 0.31, zb + 0.6]} c="#617080" round={0.07} />
          <Box s={[0.5, 0.4, 0.12]} p={[-0.7, 0.62, zb + 0.4]} c={accent} round={0.05} />
          <Box s={[0.5, 0.4, 0.12]} p={[0.7, 0.62, zb + 0.4]} c="#d8cdb8" round={0.05} />
          {/* table basse, tapis, lampadaire, plante, tableau, bibliothèque */}
          <Box s={[1.2, 0.05, 0.65]} p={[0, 0.42, zb + 2.1]} c="#4a392b" r={0.4} />
          {[[-0.52, -0.25], [0.52, -0.25], [-0.52, 0.25], [0.52, 0.25]].map(([dx, dz]) => <Cyl key={`${dx}${dz}`} r={0.025} h={0.4} p={[dx, 0.2, zb + 2.1 + dz]} c="#2c241c" />)}
          <Cyl r={0.02} h={1.6} p={[-2.5, 0.8, Z0 - 1.2]} c="#2a2a2e" m={0.7} />
          <Cyl r={0.17} rb={0.26} h={0.32} p={[-2.5, 1.7, Z0 - 1.2]} c="#f3e7cf" e="#ffd9a0" rough={0.9} />
          <Cyl r={0.2} h={0.38} p={[2.35, 0.19, Z0 - 1.1]} c="#d9d2c6" />
          <Ball r={0.42} p={[2.35, 0.78, Z0 - 1.1]} c="#3f7a45" />
          <Ball r={0.3} p={[2.5, 1.05, Z0 - 1.0]} c="#4d8d52" />
          <Box s={[1.5, 0.95, 0.04]} p={[0, 1.65, zb + 0.03]} c="#c4a46a" round={0.01} />
          <Box s={[1.38, 0.83, 0.02]} p={[0, 1.65, zb + 0.055]} c="#8ea3b3" r={0.9} />
          <Box s={[0.4, 2.1, 1.5]} p={[RW / 2 - 0.25, 1.05, Z0 - 3]} c="#7a5b3d" r={0.5} />
          {[0.5, 1.0, 1.5, 1.95].map((y) => <Box key={y} s={[0.36, 0.28, 1.3]} p={[RW / 2 - 0.3, y, Z0 - 3]} c={y > 1.4 ? "#c9b48f" : "#a98d68"} r={0.8} />)}
          <Cyl r={0.012} h={0.5} p={[0, 2.5, Z0 - 2.2]} c="#222" />
          <Ball r={0.17} p={[0, 2.2, Z0 - 2.2]} c="#fff4e0" e="#ffe1b0" />
        </group>
      )}
      {kind === "kitchen" && (
        <group>
          {/* plan de travail le long du mur du fond, crédence, placards hauts, hotte, réfrigérateur */}
          <Box s={[4.2, 0.86, 0.62]} p={[-0.5, 0.43, zb + 0.32]} c="#ebe7df" r={0.4} />
          <Box s={[4.3, 0.04, 0.66]} p={[-0.5, 0.88, zb + 0.34]} c="#2e3135" r={0.25} />
          <Box s={[4.2, 0.62, 0.02]} p={[-0.5, 1.2, zb + 0.015]} c="#d9e0e1" r={0.2} />
          <Box s={[2.4, 0.72, 0.36]} p={[-1.4, 1.95, zb + 0.19]} c="#ebe7df" r={0.4} />
          <Box s={[0.9, 0.12, 0.5]} p={[1.0, 2.0, zb + 0.27]} c="#aeb4bb" m={0.85} r={0.3} />
          <Box s={[0.28, 0.5, 0.28]} p={[1.0, 2.35, zb + 0.2]} c="#aeb4bb" m={0.85} r={0.3} />
          <Box s={[0.85, 1.9, 0.72]} p={[2.5, 0.95, zb + 0.4]} c="#c4cad1" m={0.7} r={0.25} />
          {/* îlot central, tabourets, suspensions */}
          <Box s={[2.1, 0.88, 0.85]} p={[-0.3, 0.44, zb + 2.0]} c="#2f4f66" r={0.45} />
          <Box s={[2.2, 0.05, 0.95]} p={[-0.3, 0.9, zb + 2.0]} c="#ece9e2" r={0.2} />
          {[-0.9, -0.3, 0.3].map((x) => (
            <group key={x}>
              <Cyl r={0.17} h={0.06} p={[x, 0.68, zb + 2.75]} c="#26282c" />
              <Cyl r={0.02} h={0.66} p={[x, 0.33, zb + 2.75]} c="#bfc5cc" m={0.8} />
            </group>
          ))}
          {[-0.8, 0.2].map((x) => (
            <group key={x}>
              <Cyl r={0.008} h={0.7} p={[x, 2.4, zb + 2.0]} c="#222" />
              <Ball r={0.16} p={[x, 2.0, zb + 2.0]} c="#fff1d6" e="#ffdca0" />
            </group>
          ))}
          <Ball r={0.11} p={[-0.3, 1.02, zb + 2.0]} c="#d6532a" />
          <Ball r={0.1} p={[-0.1, 1.01, zb + 1.9]} c="#e6b43a" />
        </group>
      )}
      {kind === "shower" && (
        <group>
          {/* douche à l'italienne : receveur, parois de verre, pommeau de pluie */}
          <Box s={[2.3, 0.05, 1.3]} p={[1.9, 0.025, zb + 0.75]} c="#c9cfd3" r={0.3} />
          <Box s={[2.3, 2.1, 0.015]} p={[1.9, 1.05, zb + 1.42]} c="#cfe8f2" r={0.05} opacity={0.22} />
          <Box s={[0.015, 2.1, 1.3]} p={[0.75, 1.05, zb + 0.75]} c="#cfe8f2" r={0.05} opacity={0.22} />
          <Cyl r={0.014} h={0.55} p={[2.75, 2.15, zb + 0.14]} c="#c9ced4" m={0.9} rough={0.2} />
          <mesh position={[2.75, 2.3, zb + 0.46]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.17, 0.17, 0.02, 28]} /><meshStandardMaterial color="#d3d8dd" metalness={0.9} roughness={0.2} /></mesh>
          <Cyl r={0.016} h={1.0} p={[2.75, 1.4, zb + 0.06]} c="#c9ced4" m={0.9} rough={0.2} />
          {/* meuble vasque en bois, plan en marbre, vasque, robinet, miroir et bandeau lumineux */}
          <Box s={[1.5, 0.78, 0.5]} p={[-1.8, 0.39, zb + 0.28]} c="#8c6a48" r={0.5} />
          <Box s={[1.56, 0.04, 0.54]} p={[-1.8, 0.8, zb + 0.29]} c="#f1eee8" r={0.15} />
          <Cyl r={0.23} h={0.09} p={[-1.8, 0.86, zb + 0.32]} c="#fbfbfb" rough={0.15} />
          <Cyl r={0.012} h={0.2} p={[-1.8, 0.93, zb + 0.1]} c="#d0d5db" m={0.95} rough={0.15} />
          <Box s={[1.2, 0.95, 0.02]} p={[-1.8, 1.6, zb + 0.015]} c="#b8c6d4" m={0.95} r={0.05} />
          <Box s={[1.2, 0.04, 0.05]} p={[-1.8, 2.15, zb + 0.05]} c="#fffaf0" e="#fff0cf" />
          <Box s={[0.5, 0.05, 0.3]} p={[-0.2, 1.1, zb + 0.16]} c="#f6f6f4" r={0.9} />
          <Cyl r={0.15} h={0.35} p={[0.3, 0.17, zb + 1.6]} c="#d6d0c4" />
          <Ball r={0.3} p={[0.3, 0.62, zb + 1.6]} c="#4b8553" />
        </group>
      )}
    </group>
  );
}

// Arbre : tronc et trois masses de feuillage de verts légèrement différents.
function Tree({ x, z, s = 1, tone = "#3c7a40" }: { x: number; z: number; s?: number; tone?: string }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <Cyl r={0.14} rb={0.2} h={2.3} p={[0, 1.15, 0]} c="#6a4c33" rough={1} />
      <Ball r={1.35} p={[0, 3.0, 0]} c={tone} />
      <Ball r={1.0} p={[0.8, 2.6, 0.3]} c="#4a8a47" />
      <Ball r={0.95} p={[-0.8, 2.7, -0.2]} c="#356f3a" />
    </group>
  );
}

export function Surroundings({ W, H, stage, room }: { W: number; H: number; stage: Stage; room?: Room }) {
  const sill = stage.sill ?? 0;
  const T = 0.3;
  const reach = 60; // la façade déborde loin de chaque côté : aucun bout de mur visible
  const high = 14;
  const topH = high - sill - H;
  const plasters = usePlasterFor(stage.wall, reach, high, W, sill, topH);
  const mat = (i: number) => <meshStandardMaterial map={plasters?.[i] ?? undefined} color={plasters ? "#ffffff" : stage.wall} roughness={0.95} />;
  const wall = (w: number, h: number, x: number, y: number, i: number) => (
    <mesh position={[x, y, -T / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, h, T]} />
      {mat(i)}
    </mesh>
  );
  const grass = useMemo(() => (typeof document === "undefined" ? null : grassTex()), []);
  // massif fleuri au pied de la façade, haies, arbres : positions déterministes (même jardin à chaque rendu)
  const plants = useMemo(() => {
    const r = rnd(5);
    const out: { x: number; y: number; z: number; r: number; c: string }[] = [];
    for (let x = -(W / 2 + 3.2); x <= W / 2 + 3.2; x += 0.3) {
      if (sill === 0 && Math.abs(x) < W / 2 + 0.55) continue; // l'accès à la porte reste dégagé
      const rr = 0.1 + r() * 0.1;
      out.push({ x: x + (r() - 0.5) * 0.15, y: 0.14 + rr * 0.6, z: 0.18 + r() * 0.3, r: rr, c: ["#3f7a41", "#4a8a47", "#356f3a", "#5b9a4d"][Math.floor(r() * 4)] });
      if (r() > 0.45) out.push({ x: x + (r() - 0.5) * 0.2, y: 0.34 + r() * 0.12, z: 0.2 + r() * 0.35, r: 0.045, c: ["#e8648a", "#f4f1ea", "#f1c43c", "#c93a5a"][Math.floor(r() * 4)] });
    }
    return out;
  }, [W, sill]);
  return (
    <group>
      {wall(reach, high, -(W / 2 + reach / 2), high / 2, 0)}
      {wall(reach, high, W / 2 + reach / 2, high / 2, 0)}
      {sill > 0 && wall(W, sill, 0, sill / 2, 1)}
      {wall(W, topH, 0, sill + H + topH / 2, 2)}
      {/* ni appui ni auvent : l'ouvrage reste seul dans le mur, rien ne perturbe la vue */}
      {room ? <Interior kind={room} accent={stage.wall} /> : (
        <>
          {/* pièce derrière la vitre : plus sombre que l'extérieur, éclairée en chaud */}
          <mesh position={[0, 2.4, -1.7]}>
            <planeGeometry args={[14, 8]} />
            <meshStandardMaterial color={stage.interior ?? "#5f4d39"} roughness={1} />
          </mesh>
          <pointLight position={[0, sill + H * 0.7, -0.9]} intensity={1.3} distance={5} color="#ffd9a0" />
        </>
      )}
      {/* jardin : pelouse, massif, haies, arbres, dallage vers la porte */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 12]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial map={grass ?? undefined} color={grass ? "#ffffff" : stage.ground} roughness={1} />
      </mesh>
      {/* gravier sombre au pied du mur, puis dalles de béton lissé le long de la façade */}
      <Box s={[W + 14, 0.04, 0.45]} p={[0, 0.02, 0.23]} c="#34363a" r={1} />
      <Box s={[W + 14, 0.05, 1.05]} p={[0, 0.025, 0.98]} c="#b7babd" r={0.55} />
      {Array.from({ length: Math.ceil((W + 14) / 1.5) }, (_, k) => <Box key={k} s={[0.012, 0.052, 1.05]} p={[-(W + 14) / 2 + k * 1.5, 0.026, 0.98]} c="#8f9296" r={1} />)}
      {plants.filter((_, i) => i % 3 === 0).map((p, i) => <Ball key={i} r={p.r * 1.3} p={[p.x, p.y, p.z + 0.1]} c={p.c} />)}
      <Box s={[7, 1.0, 0.8]} p={[-(W / 2 + 6.5), 0.5, 2.6]} c="#386d36" round={0.3} r={1} />
      <Box s={[7, 1.0, 0.8]} p={[W / 2 + 6.5, 0.5, 2.6]} c="#386d36" round={0.3} r={1} />
      <Box s={[60, 3.4, 1.3]} p={[0, 1.7, 15]} c="#2c5a2d" round={0.5} r={1} />
      <Box s={[60, 2.6, 1.2]} p={[0, 1.3, 13.6]} c="#356a35" round={0.5} r={1} />
      {[-22, -14, -6, 5, 13, 21].map((x, i) => (
        <group key={x} position={[x, 0, 16 + (i % 2) * 2]}>
          <Cyl r={0.12} h={1.2} p={[0, 0.6, 0]} c="#5a4330" rough={1} />
          <mesh position={[0, 3.6, 0]} castShadow><coneGeometry args={[1.3, 6, 14]} /><meshStandardMaterial color={i % 2 ? "#2a5a31" : "#1f4d2b"} roughness={1} /></mesh>
        </group>
      ))}
      {/* terrasse en bois avec pergola sombre, table et chaises */}
      <group position={[-(W / 2 + 6.2), 0, 3.4]}>
        <Box s={[4.2, 0.28, 3.2]} p={[0, 0.14, 0]} c="#7a5638" r={0.7} />
        <Box s={[1.8, 0.14, 0.4]} p={[0, 0.07, 1.8]} c="#7a5638" r={0.7} />
        {[[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]].map(([x, z]) => <Box key={`${x}${z}`} s={[0.12, 2.6, 0.12]} p={[x, 1.58, z]} c="#2c2f33" r={0.5} />)}
        {Array.from({ length: 9 }, (_, k) => <Box key={k} s={[4.4, 0.08, 0.1]} p={[0, 2.92, -1.5 + k * 0.375]} c="#2c2f33" r={0.5} />)}
        <Box s={[1.3, 0.05, 0.8]} p={[0, 0.82, 0]} c="#3a2e24" r={0.5} />
        {[[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]].map(([x, z]) => (
          <group key={`${x}${z}`}>
            <Box s={[0.42, 0.05, 0.42]} p={[x, 0.5, z]} c="#23262a" r={0.8} />
            <Box s={[0.42, 0.4, 0.05]} p={[x, 0.72, z + (z > 0 ? 0.2 : -0.2)]} c="#23262a" r={0.8} />
          </group>
        ))}
      </group>
      <Tree x={-(W / 2 + 4.2)} z={4.5} s={1.1} />
      <Tree x={W / 2 + 5.5} z={3.5} s={1} tone="#437f43" />
      <Tree x={-(W / 2 + 12)} z={8} s={1.3} tone="#357036" />
      <Tree x={W / 2 + 11} z={9} s={1.2} />
      <fog attach="fog" args={[stage.sky, 25, 80]} />
      <color attach="background" args={[stage.sky]} />
    </group>
  );
}

