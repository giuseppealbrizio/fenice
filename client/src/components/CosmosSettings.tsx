import { useState, useCallback } from 'react';
import {
  useCosmosSettingsStore,
  COSMOS_DEFAULTS,
  type CosmosSettings,
} from '../stores/cosmos-settings.store';
import { useViewStore } from '../stores/view.store';
import { useCinematicStore, CINEMATIC_PRESETS } from '../stores/cinematic.store';

interface SliderRowProps {
  label: string;
  field: keyof CosmosSettings;
  min: number;
  max: number;
  step: number;
}

function SliderRow({ label, field, min, max, step }: SliderRowProps): React.JSX.Element {
  const value = useCosmosSettingsStore((s) => s[field]);
  const set = useCosmosSettingsStore((s) => s.set);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '4px 0',
      }}
    >
      <label
        style={{
          fontSize: '11px',
          color: '#8899bb',
          width: '100px',
          flexShrink: 0,
        }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value as number}
        onChange={(e) => set({ [field]: parseFloat(e.target.value) })}
        style={{
          flex: 1,
          height: '4px',
          accentColor: '#00e5ff',
          cursor: 'pointer',
        }}
      />
      <span
        style={{
          fontSize: '11px',
          color: '#6f7ca3',
          width: '42px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {(value as number).toFixed(2)}
      </span>
    </div>
  );
}

const SLIDER_CONFIG: Array<{ group: string; sliders: SliderRowProps[] }> = [
  {
    group: 'Layout',
    sliders: [
      { label: 'Inner Ring', field: 'innerRingRadius', min: 5, max: 30, step: 1 },
      { label: 'Outer Ring', field: 'outerRingRadius', min: 15, max: 50, step: 1 },
      { label: 'Y Spread', field: 'ySpread', min: 0, max: 20, step: 0.5 },
    ],
  },
  {
    group: 'Stars',
    sliders: [
      { label: 'Core Size', field: 'starCoreRadius', min: 0.2, max: 2.0, step: 0.05 },
      { label: 'Emissive', field: 'starEmissiveIntensity', min: 0.1, max: 3.0, step: 0.1 },
      { label: 'Glow Scale', field: 'starGlowScale', min: 1, max: 10, step: 0.5 },
    ],
  },
  {
    group: 'Planets',
    sliders: [
      { label: 'Min Size', field: 'planetMinSize', min: 0.1, max: 1.0, step: 0.05 },
      { label: 'Max Size', field: 'planetMaxSize', min: 0.3, max: 2.0, step: 0.05 },
      { label: 'Orbit Speed', field: 'orbitSpeed', min: 0.01, max: 0.5, step: 0.01 },
    ],
  },
  {
    group: 'Routes',
    sliders: [
      { label: 'Arch Height', field: 'routeArchHeight', min: 0, max: 10, step: 0.5 },
      { label: 'Opacity', field: 'routeOpacity', min: 0.05, max: 1, step: 0.05 },
    ],
  },
  {
    group: 'Bloom',
    sliders: [
      { label: 'Intensity', field: 'bloomIntensity', min: 0, max: 3, step: 0.1 },
      { label: 'Threshold', field: 'bloomThreshold', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    group: 'Post-Process',
    sliders: [
      { label: 'SSAO Power', field: 'ssaoIntensity', min: 0, max: 200, step: 5 },
      { label: 'SSAO Radius', field: 'ssaoRadius', min: 0.1, max: 5.0, step: 0.1 },
      { label: 'DoF Bokeh', field: 'dofBokehScale', min: 0, max: 20, step: 0.5 },
      { label: 'DoF Focus', field: 'dofFocusDistance', min: 0, max: 0.5, step: 0.01 },
      { label: 'Vignette', field: 'vignetteDarkness', min: 0, max: 1, step: 0.05 },
      { label: 'Noise', field: 'noiseOpacity', min: 0, max: 1, step: 0.02 },
    ],
  },
  {
    group: 'Atmosphere',
    sliders: [
      { label: 'Haze Mult', field: 'hazeOpacity', min: 0, max: 20, step: 0.5 },
      { label: 'Nebula Opa', field: 'nebulaOpacity', min: 0, max: 1, step: 0.02 },
      { label: 'Dust Opa', field: 'dustOpacity', min: 0, max: 1, step: 0.02 },
      { label: 'Fog Opacity', field: 'fogOpacity', min: 0, max: 1, step: 0.02 },
    ],
  },
  {
    group: 'Camera',
    sliders: [
      { label: 'Rotate Speed', field: 'autoRotateSpeed', min: 0, max: 3, step: 0.05 },
      { label: 'Damping', field: 'cameraDamping', min: 0.01, max: 0.3, step: 0.01 },
    ],
  },
];

// ─── Cinematic controls ─────────────────────────────────────────────────────

function CinematicControls(): React.JSX.Element {
  const active = useCinematicStore((s) => s.active);
  const playing = useCinematicStore((s) => s.playing);
  const presetName = useCinematicStore((s) => s.presetName);
  const progress = useCinematicStore((s) => s.progress);
  const speed = useCinematicStore((s) => s.speed);
  const play = useCinematicStore((s) => s.play);
  const stop = useCinematicStore((s) => s.stop);
  const pause = useCinematicStore((s) => s.pause);
  const resume = useCinematicStore((s) => s.resume);
  const setSpeed = useCinematicStore((s) => s.setSpeed);

  return (
    <div>
      {/* Preset buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
        {CINEMATIC_PRESETS.map((preset) => {
          const isActive = active && presetName === preset.name;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                if (isActive) {
                  stop();
                } else {
                  play(preset.name);
                }
              }}
              style={{
                border: `1px solid ${isActive ? '#ff8800' : 'rgba(0, 229, 255, 0.2)'}`,
                backgroundColor: isActive ? 'rgba(255, 136, 0, 0.15)' : 'rgba(0, 0, 15, 0.8)',
                color: isActive ? '#ffaa44' : '#8899bb',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                letterSpacing: '0.3px',
              }}
            >
              {isActive ? `${preset.label}` : preset.label}
            </button>
          );
        })}
      </div>

      {/* Playback controls (only when active) */}
      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Progress bar */}
          <div
            style={{
              height: '3px',
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: '#ff8800',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Pause / Resume */}
            <button
              type="button"
              onClick={() => (playing ? pause() : resume())}
              style={{
                border: '1px solid rgba(255, 136, 0, 0.3)',
                backgroundColor: 'rgba(0, 0, 15, 0.8)',
                color: '#ffaa44',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </button>

            {/* Stop */}
            <button
              type="button"
              onClick={stop}
              style={{
                border: '1px solid rgba(255, 68, 68, 0.3)',
                backgroundColor: 'rgba(0, 0, 15, 0.8)',
                color: '#ff6666',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Stop
            </button>

            {/* Speed control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '10px', color: '#6f7ca3' }}>Speed</span>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{
                  width: '60px',
                  height: '3px',
                  accentColor: '#ff8800',
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: '#ffaa44',
                  width: '28px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {speed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main settings panel ────────────────────────────────────────────────────

export function CosmosSettings(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const resetDefaults = useCosmosSettingsStore((s) => s.resetDefaults);
  const sceneMode = useViewStore((s) => s.sceneMode);

  const handleCopyConfig = useCallback(() => {
    const state = useCosmosSettingsStore.getState();
    const config: Record<string, number> = {};
    for (const key of Object.keys(COSMOS_DEFAULTS) as Array<keyof CosmosSettings>) {
      config[key] = state[key] as number;
    }
    void navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  }, []);

  // Only show in cosmos mode
  if (sceneMode !== 'cosmos') return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            border: '1px solid rgba(0, 229, 255, 0.3)',
            backgroundColor: 'rgba(0, 0, 8, 0.85)',
            color: '#e0f0ff',
            borderRadius: '999px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(0, 165, 255, 0.22)',
          }}
        >
          Settings
        </button>
      )}

      {open && (
        <div
          style={{
            backgroundColor: 'rgba(2, 2, 12, 0.94)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '12px',
            padding: '18px 20px',
            width: '340px',
            maxHeight: '75vh',
            overflowY: 'auto',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(0, 229, 255, 0.12)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#00e5ff',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
              }}
            >
              Galaxy Settings
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: '1px solid rgba(0, 229, 255, 0.15)',
                background: 'rgba(0, 0, 15, 0.6)',
                color: '#6f7ca3',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              x
            </button>
          </div>

          {/* Cinematic presets */}
          <div
            style={{
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255, 136, 0, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: '#ff8800',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              Cinematic
            </div>
            <CinematicControls />
          </div>

          {/* Slider groups */}
          {SLIDER_CONFIG.map(({ group, sliders }, groupIdx) => (
            <div
              key={group}
              style={{
                marginBottom: '16px',
                paddingBottom: groupIdx < SLIDER_CONFIG.length - 1 ? '12px' : '0',
                borderBottom:
                  groupIdx < SLIDER_CONFIG.length - 1
                    ? '1px solid rgba(0, 229, 255, 0.08)'
                    : 'none',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#4a5a80',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '8px',
                  fontWeight: 600,
                }}
              >
                {group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sliders.map((s) => (
                  <SliderRow key={s.field} {...s} />
                ))}
              </div>
            </div>
          ))}

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(0, 229, 255, 0.12)',
            }}
          >
            <button
              type="button"
              onClick={resetDefaults}
              style={{
                flex: 1,
                border: '1px solid rgba(0, 229, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 15, 0.8)',
                color: '#8899bb',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleCopyConfig}
              style={{
                flex: 1,
                border: '1px solid rgba(0, 229, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 15, 0.8)',
                color: '#8899bb',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Copy Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
