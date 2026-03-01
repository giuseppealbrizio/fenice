import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCosmosSettingsStore } from '../stores/cosmos-settings.store';

// ─── GLSL Simplex 3D Noise (Ashima Arts, public domain) ────────────────────

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}
`;

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uColorCore;
uniform vec3 uColorRing;
uniform vec3 uColorOuter;
uniform vec3 uColorAccent;

varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  // Asymmetric organic distortion
  float warp = snoise(vec3(angle * 1.5, dist * 2.0, uSeed)) * 0.18;
  float d = dist + warp;

  // Radial zones
  float core = smoothstep(0.32, 0.0, d);
  float ring = exp(-pow((d - 0.36) * 4.5, 2.0));
  float outer = smoothstep(1.0, 0.15, d);

  // Multi-scale noise
  vec3 np = vec3(uv * 3.5, uTime * 0.018 + uSeed);
  float n1 = fbm(np);
  float n2 = fbm(np * 2.2 + 7.0);
  float n3 = fbm(np * 5.5 + 17.0);

  // Dark absorption lanes
  float darkLane = smoothstep(-0.12, 0.28, n2) * 0.65 + 0.35;

  // Filaments / bright knots in ring area
  float filaments = pow(max(0.0, n3), 1.6) * ring;

  // Color composition
  vec3 color = vec3(0.0);
  color += uColorOuter * outer * (0.45 + n1 * 0.55);
  color += uColorRing * ring * (0.65 + n2 * 0.35);
  color += uColorCore * core * (0.85 + n1 * 0.15);
  color += uColorAccent * filaments * 0.9;

  // Apply dark lanes
  color *= darkLane;

  // Brightness boost in ring
  color *= 1.0 + ring * 0.4 + core * 0.3;

  // Alpha
  float alpha = outer * 0.35 + ring * 0.8 + core * 0.95 + filaments * 0.5;
  alpha *= smoothstep(1.0, 0.75, dist);
  alpha *= uOpacity;

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

// ─── Nebula palettes ────────────────────────────────────────────────────────

interface NebulaPalette {
  core: [number, number, number];
  ring: [number, number, number];
  outer: [number, number, number];
  accent: [number, number, number];
}

const PALETTES: NebulaPalette[] = [
  // Helix — blue-lavender core, golden ring, deep purple haze
  {
    core: [0.39, 0.51, 0.82],
    ring: [0.9, 0.67, 0.2],
    outer: [0.39, 0.12, 0.39],
    accent: [1.0, 0.55, 0.27],
  },
  // Carina — teal core, magenta ring, crimson haze
  {
    core: [0.24, 0.67, 0.67],
    ring: [0.78, 0.24, 0.67],
    outer: [0.51, 0.08, 0.2],
    accent: [1.0, 0.39, 0.78],
  },
  // Eagle — pale blue core, emerald ring, deep indigo haze
  {
    core: [0.51, 0.65, 0.9],
    ring: [0.31, 0.78, 0.39],
    outer: [0.12, 0.12, 0.39],
    accent: [0.67, 0.9, 0.51],
  },
  // Orion — rose core, amber ring, deep violet haze
  {
    core: [0.78, 0.39, 0.59],
    ring: [0.9, 0.55, 0.24],
    outer: [0.24, 0.08, 0.35],
    accent: [1.0, 0.43, 0.43],
  },
  // Cat's Eye — cyan core, lime ring, teal haze
  {
    core: [0.27, 0.78, 0.9],
    ring: [0.51, 0.9, 0.24],
    outer: [0.06, 0.27, 0.27],
    accent: [0.39, 1.0, 0.71],
  },
  // Butterfly — warm white core, pink ring, deep magenta haze
  {
    core: [0.9, 0.82, 0.78],
    ring: [0.9, 0.35, 0.55],
    outer: [0.35, 0.06, 0.27],
    accent: [1.0, 0.67, 0.78],
  },
  // Ring — pale gold core, blue-white ring, dark teal haze
  {
    core: [0.82, 0.78, 0.55],
    ring: [0.55, 0.71, 0.9],
    outer: [0.08, 0.16, 0.24],
    accent: [0.78, 0.9, 1.0],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

interface ShaderNebulaInstance {
  position: [number, number, number];
  scale: number;
  seed: number;
  palette: NebulaPalette;
}

function createMaterial(palette: NebulaPalette, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.5 },
      uSeed: { value: seed },
      uColorCore: { value: new THREE.Vector3(...palette.core) },
      uColorRing: { value: new THREE.Vector3(...palette.ring) },
      uColorOuter: { value: new THREE.Vector3(...palette.outer) },
      uColorAccent: { value: new THREE.Vector3(...palette.accent) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function ShaderNebulae(): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const nebulaOpacity = useCosmosSettingsStore((s) => s.nebulaOpacity);

  const { instances, materials } = useMemo(() => {
    const inst: ShaderNebulaInstance[] = [];
    const mats: THREE.ShaderMaterial[] = [];

    for (let i = 0; i < 7; i++) {
      const palette = PALETTES[i]!;
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 55 + Math.random() * 55;
      const seed = i * 13.37 + Math.random() * 10;
      inst.push({
        position: [Math.cos(angle) * dist, (Math.random() - 0.5) * 30, Math.sin(angle) * dist],
        scale: 55 + Math.random() * 50,
        seed,
        palette,
      });
      mats.push(createMaterial(palette, seed));
    }

    return { instances: inst, materials: mats };
  }, []);

  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < groupRef.current.children.length; i++) {
      const mesh = groupRef.current.children[i] as THREE.Mesh;
      const mat = materials[i];
      if (!mesh || !mat) continue;

      // Billboard: face camera
      mesh.quaternion.copy(camera.quaternion);

      // Update uniforms
      mat.uniforms.uTime!.value = t;
      mat.uniforms.uOpacity!.value = nebulaOpacity;
    }
  });

  return (
    <group ref={groupRef}>
      {instances.map((inst, i) => {
        const mat = materials[i];
        if (!mat) return null;
        return (
          <mesh key={i} position={inst.position} material={mat}>
            <planeGeometry args={[inst.scale, inst.scale]} />
          </mesh>
        );
      })}
    </group>
  );
}
