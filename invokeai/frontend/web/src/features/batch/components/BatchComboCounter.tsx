import { Badge, Text } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectBatchSlice, selectBatchTotalImages } from 'features/batch/store/batchSlice';
import { memo } from 'react';

export const BatchComboCounter = memo(() => {
  const totalImages = useAppSelector(selectBatchTotalImages);
  const batch = useAppSelector(selectBatchSlice);

  const enabledPrompts = batch.prompts.filter((p) => p.isEnabled).length;
  const enabledModels = batch.models.filter((m) => m.isEnabled).length;

  if (enabledPrompts === 0 || enabledModels === 0) {
    return (
      <Text fontSize="xs" color="base.500" noOfLines={1}>
        Add prompts and models to start
      </Text>
    );
  }

  return (
    <Badge
      colorScheme="invokeYellow"
      variant="outline"
      fontSize="xs"
      px={2}
      py={0.5}
      borderRadius="full"
      flexShrink={0}
    >
      {totalImages} image{totalImages !== 1 ? 's' : ''}
    </Badge>
  );
});
BatchComboCounter.displayName = 'BatchComboCounter';
