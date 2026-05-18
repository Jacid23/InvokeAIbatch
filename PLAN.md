# Flux Scheduler + Sigma Schedule Implementation Plan

## Problem
CivitAI Flux models specify both a **sampler** (e.g. DPM++ 2M) and a **sigma schedule** (e.g. beta, karras, sgm_uniform). InvokeAI only exposes 3 samplers (Euler, Heun, LCM) and no sigma schedule control. Models tuned for specific sampler+schedule combos produce bad results without both settings.

## Current State
- Backend: Added DPM++ 2M, DPM++ 2M SDE, DPM++ SDE, UniPC, DEIS to `schedulers.py` using `use_flow_sigmas=True`
- Frontend: Added options to `ParamFluxScheduler.tsx`, `common.ts`, `paramsSlice.ts`, `parsing.tsx`
- Problem: diffusers' `use_karras_sigmas`/`use_beta_sigmas` override `use_flow_sigmas` — they generate sigmas in [0-157] range instead of flow matching [0-1] range

## Solution
Add a second dropdown: **Sigma Schedule** (normal, karras, beta, exponential, sgm_uniform).

Generate flow-matching-compatible sigmas ourselves, then pass them to the scheduler via the `sigmas` parameter in `set_timesteps()` (for schedulers that support it) or by overriding `scheduler.sigmas` directly.

### Sigma generation (all in [0, 1] flow matching range):
- **normal** — linear from 1.0 to 0.0 (current default)
- **karras** — Karras ramp: `(σ_max^(1/ρ) + t * (σ_min^(1/ρ) - σ_max^(1/ρ)))^ρ` with σ in [0,1]
- **beta** — `scipy.stats.beta.cdf` redistribution (α=0.6, β=0.6)
- **exponential** — exponential decay curve in [0,1]
- **sgm_uniform** — uniform spacing in sigma space (what ComfyUI calls sgm_uniform)

### Files to modify

#### Backend
1. **`invokeai/backend/flux/schedulers.py`**
   - Add `FLUX_SIGMA_SCHEDULE_NAME_VALUES` Literal type
   - Add `FLUX_SIGMA_SCHEDULE_LABELS` dict
   - Add DEIS to the factory

2. **`invokeai/backend/flux/sampling_utils.py`**
   - Add `generate_flow_sigmas(num_steps, schedule_type)` function
   - Implements normal/karras/beta/exponential/sgm_uniform in [0,1] range

3. **`invokeai/app/invocations/flux_denoise.py`**
   - Add `sigma_schedule` InputField
   - Generate sigmas using new function
   - Pass custom sigmas to scheduler via `set_timesteps(sigmas=...)` or `set_timesteps(num_inference_steps=...)` depending on scheduler support
   - Bump invocation version

4. **`invokeai/app/invocations/flux2_denoise.py`**
   - Same changes as flux_denoise.py

5. **`invokeai/backend/flux/denoise.py`**
   - May need to accept pre-computed sigmas and pass them to the scheduler

#### Frontend
6. **`invokeai/frontend/web/src/features/nodes/types/common.ts`**
   - Add `zFluxSigmaScheduleField` Zod enum

7. **`invokeai/frontend/web/src/features/controlLayers/store/types.ts`**
   - Add `fluxSigmaSchedule` to state

8. **`invokeai/frontend/web/src/features/controlLayers/store/paramsSlice.ts`**
   - Add `setFluxSigmaSchedule` reducer

9. **`invokeai/frontend/web/src/features/parameters/types/parameterSchemas.ts`**
   - Add `zParameterFluxSigmaSchedule` schema

10. **`invokeai/frontend/web/src/features/parameters/components/Core/ParamFluxSigmaSchedule.tsx`**
    - New component: sigma schedule dropdown

11. **`invokeai/frontend/web/src/features/settingsAccordions/components/GenerationSettingsAccordion/GenerationSettingsAccordion.tsx`**
    - Add the new dropdown to the Flux generation settings panel

12. **`invokeai/frontend/web/src/features/nodes/util/graph/generation/buildFLUXGraph.ts`**
    - Pass `fluxSigmaSchedule` to the denoise node

13. **`invokeai/frontend/web/src/services/api/schema.ts`**
    - Add sigma_schedule enum to FluxDenoiseInvocation types

14. **`invokeai/frontend/web/src/features/metadata/parsing.tsx`**
    - Add recall handler for sigma_schedule

## Final scheduler options
Samplers: Euler, Heun, LCM, DPM++ 2M, DPM++ 2M SDE, DPM++ SDE, UniPC, DEIS
Sigma schedules: Normal, Karras, Beta, Exponential, SGM Uniform
