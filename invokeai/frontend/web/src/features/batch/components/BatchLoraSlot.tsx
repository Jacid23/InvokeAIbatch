import { Flex, IconButton, Text } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { BatchLoraCard } from 'features/batch/components/BatchLoraCard';
import { batchLoRAAddedToSlot, type BatchLoRASlot, batchLoRASlotRemoved } from 'features/batch/store/batchSlice';
import { selectBase, selectMainModelConfig } from 'features/controlLayers/store/paramsSlice';
import { ModelPicker } from 'features/parameters/components/ModelPicker';
import { memo, useCallback, useMemo } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { useLoRAModels } from 'services/api/hooks/modelsByType';
import type { LoRAModelConfig } from 'services/api/types';

type BatchLoraSlotProps = {
  slot: BatchLoRASlot;
  index: number;
  canRemove: boolean;
};

export const BatchLoraSlot = memo(({ slot, index, canRemove }: BatchLoraSlotProps) => {
  const dispatch = useAppDispatch();
  const [allLoraConfigs, { isLoading }] = useLoRAModels();
  const currentBaseModel = useAppSelector(selectBase);
  const currentMainModelConfig = useAppSelector(selectMainModelConfig);

  const compatibleLoRAs = useMemo(() => {
    if (!currentBaseModel) {
      return EMPTY_ARRAY;
    }
    return allLoraConfigs.filter((model) => {
      if (model.base !== currentBaseModel) {
        return false;
      }
      if (
        currentMainModelConfig?.base === 'flux2' &&
        'variant' in currentMainModelConfig &&
        currentMainModelConfig.variant &&
        'variant' in model &&
        model.variant
      ) {
        return model.variant === currentMainModelConfig.variant;
      }
      return true;
    });
  }, [allLoraConfigs, currentBaseModel, currentMainModelConfig]);

  const addedLoraKeys = useMemo(() => new Set(slot.loras.map((l) => l.model.key)), [slot.loras]);

  const getIsDisabled = useCallback((model: LoRAModelConfig) => addedLoraKeys.has(model.key), [addedLoraKeys]);

  const handleAddLora = useCallback(
    (model: LoRAModelConfig | null) => {
      if (!model) {
        return;
      }
      dispatch(batchLoRAAddedToSlot({ slotId: slot.id, model }));
    },
    [dispatch, slot.id]
  );

  const handleRemoveSlot = useCallback(() => {
    dispatch(batchLoRASlotRemoved({ slotId: slot.id }));
  }, [dispatch, slot.id]);

  const placeholder = useMemo(() => {
    if (isLoading) {
      return 'Loading...';
    }
    if (compatibleLoRAs.length === 0) {
      return currentBaseModel ? 'No compatible LoRAs' : 'Select a model first';
    }
    return 'Add LoRA...';
  }, [isLoading, compatibleLoRAs.length, currentBaseModel]);

  return (
    <Flex flexDir="column" gap={1.5} w="full">
      {/* Row 1: Slot label + trash (own line) */}
      <Flex alignItems="center" justifyContent="space-between" w="full">
        <Text fontSize="xs" fontWeight="semibold" color="base.400" letterSpacing="wide" textTransform="uppercase">
          LoRA Slot {index + 1}
        </Text>
        {canRemove && (
          <IconButton
            aria-label="Remove slot"
            variant="ghost"
            size="sm"
            onClick={handleRemoveSlot}
            icon={<PiTrashSimpleBold />}
            flexShrink={0}
          />
        )}
      </Flex>
      {/* Row 2: Full-width dropdown — matches model picker width */}
      <ModelPicker
        pickerId={`batch-lora-slot-${slot.id}`}
        modelConfigs={compatibleLoRAs}
        selectedModelConfig={undefined}
        onChange={handleAddLora as (model: unknown) => void}
        grouped={false}
        allowEmpty
        placeholder={placeholder}
        getIsOptionDisabled={getIsDisabled as (model: unknown) => boolean}
      />
      {/* LoRA cards — wrapping grid like gen tab LoRAList */}
      {slot.loras.length > 0 && (
        <Flex flexWrap="wrap" gap={2} w="full">
          {slot.loras.map((lora) => (
            <BatchLoraCard key={lora.id} slotId={slot.id} lora={lora} />
          ))}
        </Flex>
      )}
    </Flex>
  );
});
BatchLoraSlot.displayName = 'BatchLoraSlot';
