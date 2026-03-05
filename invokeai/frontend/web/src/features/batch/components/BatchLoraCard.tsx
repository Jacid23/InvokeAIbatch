import {
  Card,
  CardBody,
  CompositeNumberInput,
  CompositeSlider,
  Flex,
  FormControl,
  IconButton,
  Switch,
  Text,
} from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  type BatchLoRA,
  batchLoRARemovedFromSlot,
  batchLoRAToggled,
  batchLoRAWeightChanged,
  selectBatchShowThumbnails,
} from 'features/batch/store/batchSlice';
import { DEFAULT_LORA_WEIGHT_CONFIG } from 'features/controlLayers/store/lorasSlice';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { memo, useCallback } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';

// ─── LoRA Card ────────────────────────────────────────────────────────────────

const MARKS = [-1, 0, 1, 2];

type BatchLoraCardProps = {
  slotId: string;
  lora: BatchLoRA;
};

export const BatchLoraCard = memo(({ slotId, lora }: BatchLoraCardProps) => {
  const dispatch = useAppDispatch();
  const showThumbnails = useAppSelector(selectBatchShowThumbnails);
  const { data: loraConfig } = useGetModelConfigQuery(lora.model.key);

  const handleWeightChange = useCallback(
    (v: number) => {
      dispatch(batchLoRAWeightChanged({ slotId, loraId: lora.id, weight: v }));
    },
    [dispatch, slotId, lora.id]
  );

  const handleToggle = useCallback(() => {
    dispatch(batchLoRAToggled({ slotId, loraId: lora.id, isEnabled: !lora.isEnabled }));
  }, [dispatch, slotId, lora.id, lora.isEnabled]);

  const handleRemove = useCallback(() => {
    dispatch(batchLoRARemovedFromSlot({ slotId, loraId: lora.id }));
  }, [dispatch, slotId, lora.id]);

  return (
    <Card variant="lora" w="full">
      <CardBody py={1} px={2}>
        <Flex flexDir="column" gap={1}>
          {/* Name row: thumbnail + name + toggle + trash */}
          <Flex alignItems={showThumbnails ? 'flex-start' : 'center'} w="full" gap={2}>
            {showThumbnails && <StylePresetImage presetImageUrl={loraConfig?.cover_image ?? null} imageWidth={32} />}
            <Text
              noOfLines={1}
              wordBreak="break-all"
              color={lora.isEnabled ? 'base.200' : 'base.500'}
              fontSize="sm"
              flexGrow={1}
            >
              {loraConfig?.name ?? lora.model.key.substring(0, 12)}
            </Text>
            <Switch size="sm" isChecked={lora.isEnabled} onChange={handleToggle} flexShrink={0} />
            <IconButton
              aria-label="Remove LoRA"
              variant="ghost"
              size="xs"
              onClick={handleRemove}
              icon={<PiTrashSimpleBold />}
              flexShrink={0}
            />
          </Flex>
          {/* Weight row */}
          <InformationalPopover feature="loraWeight">
            <FormControl isDisabled={!lora.isEnabled}>
              <CompositeSlider
                value={lora.weight}
                onChange={handleWeightChange}
                min={DEFAULT_LORA_WEIGHT_CONFIG.sliderMin}
                max={DEFAULT_LORA_WEIGHT_CONFIG.sliderMax}
                step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
                fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
                marks={MARKS}
                defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
              />
              <CompositeNumberInput
                value={lora.weight}
                onChange={handleWeightChange}
                min={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMin}
                max={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMax}
                step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
                fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
                w={20}
                flexShrink={0}
                defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
              />
            </FormControl>
          </InformationalPopover>
        </Flex>
      </CardBody>
    </Card>
  );
});
BatchLoraCard.displayName = 'BatchLoraCard';
