import {
  Card,
  CardBody,
  CompositeNumberInput,
  CompositeSlider,
  Flex,
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
    <Card variant="lora" opacity={lora.isEnabled ? 1 : 0.7}>
      <CardBody>
        <Flex flexDir="column" gap={1} w="full">
          {/* Row 1: Thumbnail + Name — tops aligned */}
          <Flex alignItems="flex-start" gap={2} w="full">
            {showThumbnails && <StylePresetImage presetImageUrl={loraConfig?.cover_image ?? null} imageWidth={24} />}
            <Text
              noOfLines={1}
              wordBreak="break-all"
              color={lora.isEnabled ? 'base.200' : 'base.500'}
              fontWeight="semibold"
              flexGrow={1}
              minW={0}
              pt={0.5}
            >
              {loraConfig?.name ?? lora.model.key.substring(0, 12)}
            </Text>
          </Flex>
          {/* Row 2: Slider + Number + Toggle + Trash — number stays with slider */}
          <InformationalPopover feature="loraWeight">
            <Flex alignItems="center" gap={2} w="full">
              <CompositeSlider
                value={lora.weight}
                onChange={handleWeightChange}
                min={DEFAULT_LORA_WEIGHT_CONFIG.sliderMin}
                max={DEFAULT_LORA_WEIGHT_CONFIG.sliderMax}
                step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
                fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
                marks={MARKS}
                defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
                isDisabled={!lora.isEnabled}
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
                isDisabled={!lora.isEnabled}
              />
              <Switch size="sm" isChecked={lora.isEnabled} onChange={handleToggle} flexShrink={0} />
              <IconButton
                aria-label="Remove LoRA"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                icon={<PiTrashSimpleBold />}
                flexShrink={0}
              />
            </Flex>
          </InformationalPopover>
          {/* Row 3: Description */}
          {loraConfig?.description && (
            <Text fontSize="xs" color="base.500" noOfLines={2} minW={0}>
              {loraConfig.description}
            </Text>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
});
BatchLoraCard.displayName = 'BatchLoraCard';
