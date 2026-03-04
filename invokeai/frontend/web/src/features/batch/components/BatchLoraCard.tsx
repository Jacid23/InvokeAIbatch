import {
  Card,
  CardBody,
  CardHeader,
  CompositeNumberInput,
  CompositeSlider,
  Flex,
  Icon,
  IconButton,
  Image,
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
} from 'features/batch/store/batchSlice';
import { selectBatchShowThumbnails } from 'features/batch/store/batchSlice';
import { DEFAULT_LORA_WEIGHT_CONFIG } from 'features/controlLayers/store/lorasSlice';
import { memo, useCallback } from 'react';
import { PiImage, PiTrashSimpleBold } from 'react-icons/pi';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';

// ─── Thumbnail ────────────────────────────────────────────────────────────────

const THUMB_SIZE = '32px';

const BatchLoraThumbnail = memo(({ imageUrl }: { imageUrl?: string | null }) => {
  if (!imageUrl) {
    return (
      <Flex
        w={THUMB_SIZE}
        h={THUMB_SIZE}
        minW={THUMB_SIZE}
        bg="base.850"
        borderRadius="base"
        borderWidth="1px"
        borderColor="base.750"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Icon as={PiImage} color="base.500" boxSize="16px" />
      </Flex>
    );
  }
  return (
    <Image
      src={imageUrl}
      w={THUMB_SIZE}
      h={THUMB_SIZE}
      minW={THUMB_SIZE}
      objectFit="cover"
      objectPosition="50% 50%"
      borderRadius="base"
      borderWidth="1px"
      borderColor="base.750"
      flexShrink={0}
      fallback={
        <Flex
          w={THUMB_SIZE}
          h={THUMB_SIZE}
          minW={THUMB_SIZE}
          bg="base.850"
          borderRadius="base"
          borderWidth="1px"
          borderColor="base.750"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon as={PiImage} color="base.500" boxSize="16px" />
        </Flex>
      }
    />
  );
});
BatchLoraThumbnail.displayName = 'BatchLoraThumbnail';

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
      <CardHeader>
        <Flex alignItems="center" justifyContent="space-between" width="100%" gap={2}>
          {showThumbnails && <BatchLoraThumbnail imageUrl={loraConfig?.cover_image} />}
          <Text
            noOfLines={1}
            wordBreak="break-all"
            color={lora.isEnabled ? 'base.200' : 'base.500'}
            fontSize="sm"
            flexGrow={1}
          >
            {loraConfig?.name ?? lora.model.key.substring(0, 12)}
          </Text>
          <Flex alignItems="center" gap={1} flexShrink={0}>
            <Switch size="sm" isChecked={lora.isEnabled} onChange={handleToggle} />
            <IconButton
              aria-label="Remove LoRA"
              variant="ghost"
              size="xs"
              onClick={handleRemove}
              icon={<PiTrashSimpleBold />}
            />
          </Flex>
        </Flex>
      </CardHeader>
      <CardBody>
        <InformationalPopover feature="loraWeight">
          <Text fontSize="xs" color="base.400" mb={1}>
            Weight
          </Text>
        </InformationalPopover>
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
      </CardBody>
    </Card>
  );
});
BatchLoraCard.displayName = 'BatchLoraCard';
