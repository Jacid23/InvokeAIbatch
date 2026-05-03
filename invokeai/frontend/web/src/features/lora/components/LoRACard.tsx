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
  buildSelectLoRA,
  DEFAULT_LORA_WEIGHT_CONFIG,
  loraDeleted,
  loraIsEnabledChanged,
  loraWeightChanged,
} from 'features/controlLayers/store/lorasSlice';
import type { LoRA } from 'features/controlLayers/store/types';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { memo, useCallback, useMemo } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';

const MARKS = [-1, 0, 1, 2];

export const LoRACard = memo((props: { id: string }) => {
  const selectLoRA = useMemo(() => buildSelectLoRA(props.id), [props.id]);
  const lora = useAppSelector(selectLoRA);

  if (!lora) {
    return null;
  }
  return <LoRAContent lora={lora} />;
});

LoRACard.displayName = 'LoRACard';

const LoRAContent = memo(({ lora }: { lora: LoRA }) => {
  const dispatch = useAppDispatch();
  const { data: loraConfig } = useGetModelConfigQuery(lora.model.key);

  const handleChange = useCallback(
    (v: number) => {
      dispatch(loraWeightChanged({ id: lora.id, weight: v }));
    },
    [dispatch, lora.id]
  );

  const handleSetLoraToggle = useCallback(() => {
    dispatch(loraIsEnabledChanged({ id: lora.id, isEnabled: !lora.isEnabled }));
  }, [dispatch, lora.id, lora.isEnabled]);

  const handleRemoveLora = useCallback(() => {
    dispatch(loraDeleted({ id: lora.id }));
  }, [dispatch, lora.id]);

  return (
    <Card variant="lora" opacity={lora.isEnabled ? 1 : 0.7}>
      <CardBody>
        <Flex flexDir="column" gap={1} w="full">
          {/* Row 1: Thumbnail + Name */}
          <Flex alignItems="flex-start" gap={2} w="full">
            <StylePresetImage presetImageUrl={loraConfig?.cover_image ?? null} imageWidth={24} />
            <Text
              noOfLines={1}
              wordBreak="break-all"
              color={lora.isEnabled ? 'base.200' : 'base.500'}
              fontWeight="semibold"
              flexGrow={1}
              minW={0}
              pt={0.5}
            >
              {loraConfig?.name ?? lora.model.key.substring(0, 8)}
            </Text>
          </Flex>
          {/* Row 2: Slider + Number + Toggle + Trash */}
          <InformationalPopover feature="loraWeight">
            <Flex alignItems="center" gap={2} w="full">
              <CompositeSlider
                value={lora.weight}
                onChange={handleChange}
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
                onChange={handleChange}
                min={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMin}
                max={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMax}
                step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
                fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
                w={20}
                flexShrink={0}
                defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
                isDisabled={!lora.isEnabled}
              />
              <Switch size="sm" isChecked={lora.isEnabled} onChange={handleSetLoraToggle} flexShrink={0} />
              <IconButton
                aria-label="Remove LoRA"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLora}
                icon={<PiTrashSimpleBold />}
                flexShrink={0}
              />
            </Flex>
          </InformationalPopover>
        </Flex>
      </CardBody>
    </Card>
  );
});

LoRAContent.displayName = 'LoRAContent';
