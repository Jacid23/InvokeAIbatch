import { logger } from 'app/logging/logger';
import type { AppStore } from 'app/store/store';
import { useAppStore } from 'app/store/storeHooks';
import { deepClone } from 'common/util/deepClone';
import { generateSeeds } from 'common/util/generateSeeds';
import { withResultAsync } from 'common/util/result';
import { $isBatchEnqueueing, updateBatchReadiness } from 'features/batch/store/batchReadiness';
import type { BatchLoRA, BatchLoRASlot } from 'features/batch/store/batchSlice';
import { selectBatchSlice } from 'features/batch/store/batchSlice';
import { buildFLUXGraph } from 'features/nodes/util/graph/generation/buildFLUXGraph';
import { toast } from 'features/toast/toast';
import { useCallback } from 'react';
import { serializeError } from 'serialize-error';
import { enqueueMutationFixedCacheKeyOptions, queueApi } from 'services/api/endpoints/queue';
import type { components } from 'services/api/schema';
import type { Batch, EnqueueBatchArg } from 'services/api/types';

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

  try {
    for (const modelEntry of enabledModels) {
      for (const loraCombo of loraCombos) {
        for (const steps of batch.stepsValues) {
          for (const guidance of batch.guidanceValues) {
            const result = await withResultAsync(async () => {
              // Deep clone real state and patch batch-specific fields
              const syntheticState = deepClone(realState);

              // Patch params
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

              // Build FLUX graph with synthetic state
              const { g, seed, positivePrompt } = await buildFLUXGraph({
                generationMode: 'txt2img',
                state: syntheticState,
                manager: null,
              });

              // Build batch data manually (mirroring prepareLinearUIBatch but with our prompts)
              const dataArr: Batch['data'] = [];
              const firstBatchDatum: components['schemas']['BatchDatum'][] = [];

              // Seeds: one per (prompt × imagesPerCombo) combination
              if (seed) {
                const seeds = generateSeeds({
                  count: enabledPrompts.length * batch.imagesPerCombo,
                  start: batch.shouldRandomizeSeed ? undefined : batch.seed,
                });
                firstBatchDatum.push({
                  node_path: seed.id,
                  field_name: 'value',
                  items: seeds,
                });
              }

              // Prompts: one per enabled prompt, repeated imagesPerCombo times
              const extendedPrompts = Array.from({ length: batch.imagesPerCombo }, () => enabledPrompts).flat();
              firstBatchDatum.push({
                node_path: positivePrompt.id,
                field_name: 'value',
                items: extendedPrompts,
              });

              dataArr.push(firstBatchDatum);

              const enqueueBatchArg: EnqueueBatchArg = {
                prepend,
                batch: {
                  graph: g.getGraph(),
                  runs: 1,
                  data: dataArr,
                  origin: 'batch',
                  destination: 'batch',
                },
              };

              const req = dispatch(
                queueApi.endpoints.enqueueBatch.initiate(enqueueBatchArg, {
                  ...enqueueMutationFixedCacheKeyOptions,
                  track: false,
                })
              );
              const enqueueResult = await req.unwrap();
              return enqueueResult;
            });

            if (result.isOk()) {
              totalEnqueued++;
            } else {
              errors++;
              log.error({ error: serializeError(result.error) }, 'Failed to enqueue batch combo');
            }
          }
        }
      }
    }

    if (errors > 0 && totalEnqueued === 0) {
      toast({ status: 'error', title: 'Batch enqueue failed', description: `All ${errors} combinations failed` });
    } else if (errors > 0) {
      toast({
        status: 'warning',
        title: 'Batch partially enqueued',
        description: `${totalEnqueued} succeeded, ${errors} failed`,
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
