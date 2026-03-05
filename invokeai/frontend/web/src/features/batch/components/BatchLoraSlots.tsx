import { Button, Flex } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { BatchLoraSlot } from 'features/batch/components/BatchLoraSlot';
import { batchLoRASlotAdded, selectBatchLoRASlots } from 'features/batch/store/batchSlice';
import { memo, useCallback } from 'react';
import { PiPlusBold } from 'react-icons/pi';

export const BatchLoraSlots = memo(() => {
  const dispatch = useAppDispatch();
  const slots = useAppSelector(selectBatchLoRASlots);

  const handleAddSlot = useCallback(() => {
    dispatch(batchLoRASlotAdded());
  }, [dispatch]);

  return (
    <Flex flexDir="column" gap={2} w="full">
      {slots.map((slot, index) => (
        <BatchLoraSlot key={slot.id} slot={slot} index={index} canRemove={slots.length > 1} />
      ))}
      <Button
        onClick={handleAddSlot}
        variant="ghost"
        size="sm"
        leftIcon={<PiPlusBold />}
        w="full"
        justifyContent="flex-start"
        isDisabled={slots.length >= 4}
      >
        Add LoRA Slot
      </Button>
    </Flex>
  );
});
BatchLoraSlots.displayName = 'BatchLoraSlots';
