import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, RoundedBox } from "@react-three/drei";
import type { Group, Mesh } from "three";

/* ────────────────────────────────────────────────────────────────
   Hero3D — the single 3D product visualization for QuizForge AI.

   Designed to read as *product* (a floating assessment interface),
   not as a random collection of geometry. It's a restrained set of
   translucent, softly-lit rounded cards that suggest a quiz stack.

   Rules:
     - Few objects, no sparkles / wireframe noise.
     - dpr capped for performance.
   ──────────────────────────────────────────────────────────────── */

function QuizCard({ position, rotation, tone }: { position: [number, number, number]; rotation: [number, number, number]; tone: string }) {
  const mesh = useRef<Mesh>(null!);
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.z = rotation[2] + Math.sin(state.clock.elapsedTime * 0.3) * 0.03;
  });
  return (
    <RoundedBox ref={mesh} args={[2.2, 2.9, 0.12]} radius={0.16} smoothness={4} position={position} rotation={rotation}>
      <meshPhysicalMaterial
        color={tone}
        transparent
        opacity={0.82}
        roughness={0.18}
        metalness={0.35}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
        envMapIntensity={1}
      />
    </RoundedBox>
  );
}

function HeroRig({ dark }: { dark: boolean }) {
  const root = useRef<Group>(null);
  const accent = dark ? "#046307" : "#064e3b";
  const accentSoft = dark ? "#0d9488" : "#0f766e";

  useFrame((state) => {
    if (!root.current) return;
    root.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.06;
  });

  return (
    <>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.7}>
        <group ref={root}>
          <QuizCard position={[-0.7, -0.5, -0.6]} rotation={[-0.08, 0.2, 0.12]} tone={accentSoft} />
          <QuizCard position={[0.5, 0.45, 0.2]} rotation={[0.05, -0.12, -0.1]} tone={accent} />
        </group>
      </Float>

      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 2]} intensity={0.6} />
    </>
  );
}

export default function Hero3D({ dark }: { dark: boolean }) {
  return (
    <div className="hero3d-wrap" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <HeroRig dark={dark} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
