import type { AlertStatus } from '@invoke-ai/ui-library';
import { logger } from 'app/logging/logger';
import type { AppStore } from 'app/store/store';
import { useAppStore } from 'app/store/storeHooks';
import { deepClone } from 'common/util/deepClone';
import { extractMessageFromAssertionError } from 'common/util/extractMessageFromAssertionError';
import { withResult, withResultAsync } from 'common/util/result';
import { $isBatchEnqueueing, updateBatchReadiness } from 'features/batch/store/batchReadiness';
import type { BatchLoRA, BatchLoRASlot } from 'features/batch/store/batchSlice';
import { selectBatchSlice } from 'features/batch/store/batchSlice';
import { prepareLinearUIBatch } from 'features/nodes/util/graph/buildLinearBatchConfig';
import { buildCogView4Graph } from 'features/nodes/util/graph/generation/buildCogView4Graph';
import { buildFLUXGraph } from 'features/nodes/util/graph/generation/buildFLUXGraph';
import { buildSD1Graph } from 'features/nodes/util/graph/generation/buildSD1Graph';
import { buildSD3Graph } from 'features/nodes/util/graph/generation/buildSD3Graph';
import { buildSDXLGraph } from 'features/nodes/util/graph/generation/buildSDXLGraph';
import { buildZImageGraph } from 'features/nodes/util/graph/generation/buildZImageGraph';
import type { GraphBuilderArg } from 'features/nodes/util/graph/types';
import { UnsupportedGenerationModeError } from 'features/nodes/util/graph/types';
import { toast } from 'features/toast/toast';
import { useCallback } from 'react';
import { serializeError } from 'serialize-error';
import { enqueueMutationFixedCacheKeyOptions, queueApi } from 'services/api/endpoints/queue';
import { assert, AssertionError } from 'tsafe';

const log = logger('generation');

// Build all LoRA combinations as a Cartesian product of slots.
// Each slot can have at most 1 active LoRA selected. We pick the enabled LoRAs
// across all slots, then build combos by picking 0 or 1 LoRA per slot.
function buildLoraCombinations(loraSlots: BatchLoRASlot[]): BatchLoRA[][] {
  const enabledSlots = loraSlots.filter((s) => s.loras.some((l) => l.isEnabled));

  if (enabledSlots.length === 0) {
    return [[]]; // one combo: no LoRAs
  }

  // Each slot contributes its enabled LoRAs as alternatives
  const slotOptions: BatchLoRA[][] = enabledSlots.map((slot) =>
    slot.loras.filter((l) => l.isEnabled).map((l) => ({ ...l, weight: l.weight }))
  );

  // Cartesian product
  let combos: BatchLoRA[][] = [[]];
  for (const options of slotOptions) {
    combos = combos.flatMap((combo) => options.map((lora) => [...combo, lora]));
  }

  return combos;
}

const enqueueBatch = async (store: AppStore, prepend: boolean) => {
  const { dispatch, getState } = store;
  const realState = getState();
  const batch = selectBatchSlice(realState);

  const enabledPrompts = batch.prompts.filter((p) => p.isEnabled).map((p) => p.text);
  const enabledModels = batch.models.filter((m) => m.isEnabled);
  const loraCombos = buildLoraCombinations(batch.loraSlots);

  // Validate readiness
  const reasons: string[] = [];
  if (enabledPrompts.length === 0) {
    reasons.push('No prompts enabled');
  }
  if (enabledModels.length === 0) {
    reasons.push('No models enabled');
  }
  if (loraCombos.length === 0 || (loraCombos.length === 1 && loraCombos[0]?.length === 0)) {
    // Allow empty LoRA combos (will run without LoRAs)
  }

  if (reasons.length > 0) {
    updateBatchReadiness(reasons);
    return;
  }

  $isBatchEnqueueing.set(true);

  let totalEnqueued = 0;
  let errors = 0;
  let lastErrorMsg = '';
  let lastErrorStatus: AlertStatus = 'error';

  try {
    for (const modelEntry of enabledModels) {
      const base = modelEntry.model.base;

      for (const loraCombo of loraCombos) {
        for (const steps of batch.stepsValues) {
          for (const guidance of batch.guidanceValues) {
            // Step 1: Clone state and patch batch-specific fields
            const syntheticState = deepClone(realState);

            syntheticState.params.model = modelEntry.model;
            syntheticState.params.steps = steps;
            syntheticState.params.guidance = guidance;
            syntheticState.params.dimensions.width = batch.width;
            syntheticState.params.dimensions.height = batch.height;
            syntheticState.params.iterations = batch.imagesPerCombo;
            syntheticState.params.shouldRandomizeSeed = batch.shouldRandomizeSeed;
            syntheticState.params.seed = batch.seed;

            // Patch LoRAs - replace with this combo's LoRAs
            syntheticState.loras.loras = loraCombo.map((bl) => ({
              id: bl.id,
              model: bl.model,
              weight: bl.weight,
              isEnabled: true,
            }));

            // Patch dynamic prompts so prepareLinearUIBatch picks up our prompts
            syntheticState.dynamicPrompts.prompts = enabledPrompts;
            syntheticState.dynamicPrompts.seedBehaviour = 'PER_PROMPT';

            // Patch active tab so graph builders see 'generate' instead of 'batch'
            syntheticState.ui.activeTab = 'generate';

            // Step 2: Build graph — dispatch to correct builder based on model base
            const graphBuilderArg: GraphBuilderArg = {
              generationMode: 'txt2img',
              state: syntheticState,
              manager: null,
            };

            const buildGraphResult = await withResultAsync(async () => {
              switch (base) {
                case 'sdxl':
                  return await buildSDXLGraph(graphBuilderArg);
                case 'sd-1':
                case 'sd-2':
                  return await buildSD1Graph(graphBuilderArg);
                case 'sd-3':
                  return await buildSD3Graph(graphBuilderArg);
                case 'flux':
                case 'flux2':
                  return await buildFLUXGraph(graphBuilderArg);
                case 'cogview4':
                  return await buildCogView4Graph(graphBuilderArg);
                case 'z-image':
                  return await buildZImageGraph(graphBuilderArg);
                default:
                  assert(false, `No graph builder for model base "${base}"`);
              }
            });

            if (buildGraphResult.isErr()) {
              errors++;
              if (buildGraphResult.error instanceof AssertionError) {
                lastErrorMsg =
                  extractMessageFromAssertionError(buildGraphResult.error) ?? buildGraphResult.error.message;
              } else if (buildGraphResult.error instanceof UnsupportedGenerationModeError) {
                lastErrorMsg = buildGraphResult.error.message;
                lastErrorStatus = 'warning';
              } else {
                lastErrorMsg =
                  buildGraphResult.error instanceof Error
                    ? buildGraphResult.error.message
                    : String(buildGraphResult.error);
              }
              log.error(
                { error: serializeError(buildGraphResult.error), model: modelEntry.model.name },
                `Failed to build graph: ${lastErrorMsg}`
              );
              continue;
            }

            const { g, seed, positivePrompt } = buildGraphResult.value;

            // Step 3: Build batch data — use same utility as gen tab
            const prepareBatchResult = withResult(() =>
              prepareLinearUIBatch({
                state: syntheticState,
                g,
                base,
                prepend,
                seedNode: seed,
                positivePromptNode: positivePrompt,
                origin: 'batch',
                destination: 'batch',
              })
            );

            if (prepareBatchResult.isErr()) {
              errors++;
              lastErrorMsg =
                prepareBatchResult.error instanceof Error
                  ? prepareBatchResult.error.message
                  : String(prepareBatchResult.error);
              log.error(
                { error: serializeError(prepareBatchResult.error), model: modelEntry.model.name },
                `Failed to prepare batch: ${lastErrorMsg}`
              );
              continue;
            }

            // Step 4: Enqueue
            const enqueueResult = await withResultAsync(async () => {
              const req = dispatch(
                queueApi.endpoints.enqueueBatch.initiate(prepareBatchResult.value, {
                  ...enqueueMutationFixedCacheKeyOptions,
                  track: false,
                })
              );
              return await req.unwrap();
            });

            if (enqueueResult.isOk()) {
              totalEnqueued++;
            } else {
              errors++;
              lastErrorMsg =
                enqueueResult.error instanceof Error ? enqueueResult.error.message : String(enqueueResult.error);
              log.error(
                { error: serializeError(enqueueResult.error), model: modelEntry.model.name },
                `Failed to enqueue: ${lastErrorMsg}`
              );
            }
          }
        }
      }
    }

    if (errors > 0 && totalEnqueued === 0) {
      toast({
        status: lastErrorStatus,
        title: 'Batch enqueue failed',
        description: lastErrorMsg || `All ${errors} combinations failed`,
      });
    } else if (errors > 0) {
      toast({
        status: 'warning',
        title: 'Batch partially enqueued',
        description: `${totalEnqueued} succeeded, ${errors} failed: ${lastErrorMsg}`,
      });
    } else {
      toast({
        status: 'success',
        title: 'Batch enqueued',
        description: `${totalEnqueued} combination${totalEnqueued !== 1 ? 's' : ''} queued`,
      });
    }
  } finally {
    $isBatchEnqueueing.set(false);
  }
};

export const useEnqueueBatch = () => {
  const store = useAppStore();
  const enqueue = useCallback(
    (prepend: boolean) => {
      return enqueueBatch(store, prepend);
    },
    [store]
  );
  return enqueue;
};
