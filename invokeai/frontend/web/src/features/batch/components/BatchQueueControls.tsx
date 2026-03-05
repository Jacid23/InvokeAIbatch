import { Button, Flex, Spacer, useShiftModifier } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppSelector } from 'app/store/storeHooks';
import { BatchPresetSelector } from 'features/batch/components/BatchPresetSelector';
import { useEnqueueBatch } from 'features/batch/hooks/useEnqueueBatch';
import { $isBatchEnqueueing } from 'features/batch/store/batchReadiness';
import { selectBatchSlice } from 'features/batch/store/batchSlice';
import { CancelCurrentQueueItemIconButton } from 'features/queue/components/CancelCurrentQueueItemIconButton';
import { QueueActionsMenuButton } from 'features/queue/components/QueueActionsMenuButton';
import ProgressBar from 'features/system/components/ProgressBar';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { VIEWER_PANEL_ID } from 'features/ui/layouts/shared';
import { memo, useCallback } from 'react';
import { PiLightningFill, PiSparkleFill } from 'react-icons/pi';

const BatchInvokeButton = memo(() => {
  const enqueueBatch = useEnqueueBatch();
  const shift = useShiftModifier();
  const isEnqueueing = useStore($isBatchEnqueueing);
  const batch = useAppSelector(selectBatchSlice);

  const enabledPrompts = batch.prompts.filter((p) => p.isEnabled).length;
  const enabledModels = batch.models.filter((m) => m.isEnabled).length;
  const isDisabled = enabledPrompts === 0 || enabledModels === 0 || isEnqueueing;

  const handleEnqueueBack = useCallback(() => {
    enqueueBatch(false);
    navigationApi.focusPanel('batch', VIEWER_PANEL_ID);
  }, [enqueueBatch]);

  const handleEnqueueFront = useCallback(() => {
    enqueueBatch(true);
    navigationApi.focusPanel('batch', VIEWER_PANEL_ID);
  }, [enqueueBatch]);

  return (
    <Button
      onClick={shift ? handleEnqueueFront : handleEnqueueBack}
      isLoading={isEnqueueing}
      loadingText="Invoke Batch"
      isDisabled={isDisabled}
      rightIcon={shift ? <PiLightningFill /> : <PiSparkleFill />}
      variant="solid"
      colorScheme="invokeYellow"
      size="lg"
      flexShrink={0}
      spinnerPlacement="end"
    >
      Invoke Batch
    </Button>
  );
});
BatchInvokeButton.displayName = 'BatchInvokeButton';

export const BatchQueueControls = memo(() => {
  return (
    <Flex w="full" position="relative" borderRadius="base" gap={2} flexDir="column">
      <Flex gap={2} alignItems="center">
        <BatchInvokeButton />
        <Spacer />
        <QueueActionsMenuButton />
        <CancelCurrentQueueItemIconButton />
      </Flex>
      <BatchPresetSelector />
      <ProgressBar />
    </Flex>
  );
});
BatchQueueControls.displayName = 'BatchQueueControls';
