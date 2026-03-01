import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AMBIENT_ANIMATION_CONFIG, COSMIC_LIGHTING } from '../../utils/atmosphere';

interface Props {
  baseIntensity: number;
}

const coolColor = new THREE.Color(AMBIENT_ANIMATION_CONFIG.colorTempCool);
const warmColor = new THREE.Color(AMBIENT_ANIMATION_CONFIG.colorTempWarm);

export function AnimatedKeyLight({ baseIntensity }: Props): React.JSX.Element {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const basePos = COSMIC_LIGHTING.keyLightPosition;

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.elapsedTime;

    // Intensity breathing
    const [minI, maxI] = AMBIENT_ANIMATION_CONFIG.lightIntensityRange;
    const intensity =
      minI +
      (maxI - minI) *
        (0.5 + 0.5 * Math.sin(t * ((2 * Math.PI) / AMBIENT_ANIMATION_CONFIG.lightBreathPeriod)));
    lightRef.current.intensity = intensity;

    // Arc movement (5 degrees)
    const arc = (AMBIENT_ANIMATION_CONFIG.lightArcDegrees * Math.PI) / 180;
    const swing = Math.sin(t * ((2 * Math.PI) / AMBIENT_ANIMATION_CONFIG.lightBreathPeriod)) * arc;
    lightRef.current.position.x = basePos[0] * Math.cos(swing);
    lightRef.current.position.z = basePos[2] * Math.cos(swing) + basePos[0] * Math.sin(swing);

    // Color temperature drift
    const colorT =
      0.5 + 0.5 * Math.sin(t * ((2 * Math.PI) / AMBIENT_ANIMATION_CONFIG.colorTempPeriod));
    lightRef.current.color.lerpColors(coolColor, warmColor, colorT);
  });

  return (
    <directionalLight
      ref={lightRef}
      position={basePos}
      intensity={baseIntensity}
      color={AMBIENT_ANIMATION_CONFIG.colorTempCool}
    />
  );
}
