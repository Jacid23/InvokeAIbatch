# InvokeAI Batch+ Changes

## Summary
Custom modifications to InvokeAI for expanded Flux sampler support, sigma schedule control, FP8 checkpoint compatibility, bundle format fixes, and model thumbnail auto-discovery.

---

## 1. Expanded Flux Samplers
**Problem:** InvokeAI only exposed 3 samplers for Flux (Euler, Heun, LCM). CivitAI models tuned for DPM++ 2M, UniPC, etc. produced bad results without the correct sampler.

**Backend files:**
- `invokeai/backend/flux/schedulers.py` — Added DPM++ 2M, DPM++ 2M SDE, DPM++ SDE, UniPC, DEIS with flow matching support (`use_flow_sigmas=True`, `prediction_type="flow_prediction"`)
- `invokeai/app/invocations/flux_denoise.py` — New `sigma_schedule` InputField, factory pattern for scheduler creation, version bump to 4.6.0
- `invokeai/backend/flux/denoise.py` — Fixed sigma override for schedulers that don't accept `sigmas=` in `set_timesteps()` (DPM++, DEIS, Heun). Now overrides `scheduler.sigmas` and `scheduler.timesteps` directly after initialization.

**Frontend files:**
- `frontend/web/src/features/nodes/types/common.ts` — Expanded `zFluxSchedulerField` enum (8 values)
- `frontend/web/src/features/parameters/components/Core/ParamFluxScheduler.tsx` — Updated dropdown options
- `frontend/web/src/features/controlLayers/store/paramsSlice.ts` — Updated `setFluxScheduler` type, added `setFluxSigmaSchedule` reducer + selector
- `frontend/web/src/features/controlLayers/store/types.ts` — Added `fluxSigmaSchedule` to state
- `frontend/web/src/services/api/schema.ts` — Updated all scheduler enum types (6 occurrences)

**Available samplers:** Euler, Heun, LCM, DPM++ 2M, DPM++ 2M SDE, DPM++ SDE, UniPC, DEIS

---

## 2. Sigma Schedule Control (new dropdown)
**Problem:** CivitAI models specify a sigma schedule (beta, karras, sgm_uniform) in addition to the sampler. Diffusers' built-in `use_karras_sigmas`/`use_beta_sigmas` flags override `use_flow_sigmas`, generating sigmas in [0-157] range instead of flow matching [0-1] range.

**Solution:** Generate flow-matching-compatible sigmas ourselves in [0, 1] range, then force them onto the scheduler.

**Backend files:**
- `invokeai/backend/flux/sampling_utils.py` — New `generate_flow_sigmas(num_steps, schedule_type)` function
- `invokeai/backend/flux/schedulers.py` — Added `FLUX_SIGMA_SCHEDULE_VALUES` and `FLUX_SIGMA_SCHEDULE_LABELS`

**Frontend files:**
- `frontend/web/src/features/nodes/types/common.ts` — Added `zFluxSigmaScheduleField` enum
- `frontend/web/src/features/parameters/types/parameterSchemas.ts` — Added `zParameterFluxSigmaSchedule` schema
- `frontend/web/src/features/parameters/components/Core/ParamFluxSigmaSchedule.tsx` — **New component**: sigma schedule dropdown
- `frontend/web/src/features/settingsAccordions/components/GenerationSettingsAccordion/GenerationSettingsAccordion.tsx` — Added sigma schedule dropdown to Flux settings panel
- `frontend/web/src/features/nodes/util/graph/generation/buildFLUXGraph.ts` — Passes `sigma_schedule` to denoise nodes + metadata
- `frontend/web/src/features/metadata/parsing.tsx` — Added `FluxSigmaSchedule` metadata handler for recall

**Available sigma schedules:** Normal (linear), Karras, Beta, Exponential, SGM Uniform

---

## 3. FP8 Checkpoint Compatibility
**Problem:** Some Flux checkpoints (e.g. fluxmania) include FP8 scaling metadata keys (`scale_input`, `scale_weight`, `scaled_fp8`) that aren't part of the Flux model architecture, causing `load_state_dict` to fail with unexpected keys.

**File modified:**
- `invokeai/backend/model_manager/load/model_loaders/flux.py` — Filters out FP8 metadata keys before loading

---

## 4. Bundle Format Detection Fix (.weight vs .scale)
**Problem:** Many CivitAI Flux checkpoints use `.weight` instead of `.scale` for RMSNorm layer keys (e.g. `key_norm.weight` vs `key_norm.scale`). InvokeAI's bundle detection and model probe only checked for `.scale`, causing:
- "Unable to identify model" error on import
- `load_state_dict` failures with hundreds of unexpected/missing keys

**Files modified:**
- `invokeai/backend/model_manager/configs/main.py` — Probe now recognizes `.weight` norm keys as valid Flux checkpoints
- `invokeai/backend/model_manager/util/model_util.py` — `convert_bundle_to_flux_transformer_checkpoint` now renames `.query_norm.weight` and `.key_norm.weight` to `.scale` to match model expectations
- `invokeai/backend/model_manager/load/model_loaders/flux.py` — Bundle detection checks both `.scale` and `.weight` variants (singlefile + NF4 loaders)

**Models affected:** fluxedUpFlux, fuxCapacity, humanRealism, and similar CivitAI checkpoints

---

## 5. Model Thumbnail Auto-Discovery
**Problem:** Main models (checkpoints) didn't automatically pick up matching preview images (PNG/JPG/WebP) during import, unlike LoRAs.

**File modified:**
- `invokeai/app/services/model_install/model_install_default.py` — Calls `_process_preview_image` for all model types during registration, not just LoRAs

---

## 6. UI Label Rename (CivitAI/ComfyUI Convention)
**Problem:** InvokeAI used "Scheduler" for the sampler dropdown and had no label convention for sigma schedules, unlike CivitAI/ComfyUI which use "Sampler" and "Scheduler" respectively.

**Files modified:**
- `frontend/web/src/features/parameters/components/Core/ParamFluxScheduler.tsx` — Label changed from "Scheduler" to "Sampler"
- `frontend/web/src/features/parameters/components/Core/ParamFluxSigmaSchedule.tsx` — Label changed from "Sigma Schedule" to "Scheduler"

---

## 7. Model Default Settings for Flux (Sampler + Scheduler)
**Problem:** Flux models had no way to save default sampler and scheduler (sigma schedule) per-model. Users had to manually switch every time they changed models.

**Solution:** Added `flux_sampler` and `flux_scheduler` fields to the model default settings system, with dropdowns on the model edit page and automatic application when defaults are restored.

**Backend files:**
- `invokeai/backend/model_manager/configs/main.py` — Added `flux_sampler` (FLUX_SCHEDULER_NAME_VALUES) and `flux_scheduler` (FLUX_SIGMA_SCHEDULE_VALUES) fields to `MainModelDefaultSettings`

**Frontend files:**
- `frontend/web/src/features/modelManagerV2/subpanels/ModelPanel/MainModelDefaultSettings/DefaultFluxSampler.tsx` — **New component**: Sampler dropdown for Flux model defaults (8 options)
- `frontend/web/src/features/modelManagerV2/subpanels/ModelPanel/MainModelDefaultSettings/DefaultFluxScheduler.tsx` — **New component**: Scheduler (sigma schedule) dropdown for Flux model defaults (5 options)
- `frontend/web/src/features/modelManagerV2/subpanels/ModelPanel/MainModelDefaultSettings/MainModelDefaultSettings.tsx` — Added `fluxSampler` and `fluxScheduler` to form type, imports, grid (visible for Flux/Flux2), and submit handler
- `frontend/web/src/features/modelManagerV2/hooks/useMainModelDefaultSettings.ts` — Added `fluxSampler` and `fluxScheduler` initial form values from `modelConfig.default_settings`
- `frontend/web/src/app/store/middleware/listenerMiddleware/listeners/setDefaultSettings.ts` — Dispatches `setFluxScheduler` and `setFluxSigmaSchedule` when model defaults are applied

---

## Configuration
- **Port:** 9092 (avoids conflict with Standard:9090, Latest:9091)
- **App folder:** `C:\InvokeAIbatch+\`
- **Repo folder:** `T:\InvokeAIbuilds\InvokeAIbatch+\`
- **Update:** Run `C:\InvokeAIbatch+\update.bat` to rebuild frontend + reinstall backend
