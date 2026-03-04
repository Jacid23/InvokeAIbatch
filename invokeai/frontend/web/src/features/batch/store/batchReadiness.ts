import { atom, computed } from 'nanostores';

// Reasons why the batch cannot be enqueued
export const $batchReasonsWhyCannotEnqueue = atom<string[]>([]);

// Whether the batch is ready to enqueue (no blocking reasons)
export const $isBatchReadyToEnqueue = computed($batchReasonsWhyCannotEnqueue, (reasons) => reasons.length === 0);

// Whether we are currently waiting for batch to enqueue
export const $isBatchEnqueueing = atom<boolean>(false);

export const updateBatchReadiness = (reasons: string[]) => {
  $batchReasonsWhyCannotEnqueue.set(reasons);
};
