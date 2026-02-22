# FENICE 3D World - M2D Visual QA Rubric

## Scoring model
Score each dimension from `0` to `3`.

1. `0`: unacceptable (major failure)
2. `1`: weak (needs significant rework)
3. `2`: acceptable (minor improvements possible)
4. `3`: strong (release-ready quality)

## Dimensions

### 1) Readability in 5 seconds
1. Can an operator quickly identify:
   public zone, protected zone, auth gate, and critical broken paths?
2. Pass target: score `>= 2`.

### 2) Semantic fidelity
1. Visual output matches runtime semantics with no ambiguity.
2. `blocked`, `degraded`, `ok`, `unknown` are consistently distinct.
3. Pass target: score `>= 2`.

### 3) Topology integrity
1. Visual routing reflects true graph behavior.
2. Auth-gated traffic goes via gate; non-auth traffic is not falsely rerouted.
3. Pass target: score `>= 2`.

### 4) Urban composition quality
1. City feels intentional, not sparse/noisy.
2. District hierarchy and landmarking are coherent.
3. Pass target: score `>= 2`.

### 5) Motion quality (if present)
1. Motion adds clarity, not distraction.
2. Degraded/blocked behavior communicates state without visual chaos.
3. Pass target: score `>= 2`.

### 6) Performance and fallback
1. Target FPS sustained on demo scene.
2. Quality fallback works and keeps semantics readable.
3. Pass target: score `>= 2`.

### 7) UX operability
1. Camera controls, selection focus, and side panel support investigation flow.
2. No friction during typical "incident triage" path.
3. Pass target: score `>= 2`.

## Hard fail triggers
1. Semantic precedence mismatch (`blocked > degraded > ok > unknown`) in visuals.
2. Unreadable labels/legend after effects.
3. FPS collapse without automatic downgrade path.
4. Non-deterministic layout differences for same input.

## Release recommendation
1. `Go`: all dimensions `>= 2` and no hard fail triggers.
2. `Go with fixes`: average `>= 2`, but one dimension at `1` without hard fail.
3. `No-go`: any hard fail trigger, or two or more dimensions at `1`, or any `0`.
