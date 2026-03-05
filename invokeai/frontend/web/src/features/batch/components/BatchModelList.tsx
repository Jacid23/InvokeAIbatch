import { Card, CardBody, Flex, IconButton, Switch, Text } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  batchModelAdded,
  batchModelRemoved,
  batchModelToggled,
  selectBatchModels,
  selectBatchShowThumbnails,
} from 'features/batch/store/batchSlice';
import { ModelPicker } from 'features/parameters/components/ModelPicker';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { memo, useCallback } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';
import { useMainModels } from 'services/api/hooks/modelsByType';
import type { AnyModelConfig, MainModelConfig } from 'services/api/types';

// ─── Model Card ───────────────────────────────────────────────────────────────

const BatchModelCard = memo(({ modelId, id }: { modelId: string; id: string }) => {
  const dispatch = useAppDispatch();
  const models = useAppSelector(selectBatchModels);
  const showThumbnails = useAppSelector(selectBatchShowThumbnails);
  const entry = models.find((m) => m.id === id);
  const { data: modelConfig } = useGetModelConfigQuery(modelId);

  const handleToggle = useCallback(() => {
    if (!entry) {
      return;
    }
    dispatch(batchModelToggled({ id: entry.id, isEnabled: !entry.isEnabled }));
  }, [dispatch, entry]);

  const handleRemove = useCallback(() => {
    dispatch(batchModelRemoved({ id }));
  }, [dispatch, id]);

  if (!entry) {
    return null;
  }

  return (
    <Card variant="lora" opacity={entry.isEnabled ? 1 : 0.5} w="full">
      <CardBody py={1} px={2}>
        <Flex alignItems={showThumbnails ? 'flex-start' : 'center'} gap={2} w="full">
          {showThumbnails && <StylePresetImage presetImageUrl={modelConfig?.cover_image ?? null} imageWidth={32} />}
          <Text noOfLines={1} flexGrow={1} fontSize="sm" color={entry.isEnabled ? 'base.200' : 'base.500'}>
            {modelConfig?.name ?? entry.model.key.substring(0, 12)}
          </Text>
          <Switch size="sm" isChecked={entry.isEnabled} onChange={handleToggle} />
          <IconButton
            aria-label="Remove model"
            variant="ghost"
            size="xs"
            onClick={handleRemove}
            icon={<PiTrashSimpleBold />}
          />
        </Flex>
      </CardBody>
    </Card>
  );
});
BatchModelCard.displayName = 'BatchModelCard';

// ─── Model List ───────────────────────────────────────────────────────────────

export const BatchModelList = memo(() => {
  const dispatch = useAppDispatch();
  const models = useAppSelector(selectBatchModels);
  const [modelConfigs] = useMainModels();

  const addedKeys = new Set(models.map((m) => m.model.key));

  const getIsDisabled = useCallback(
    (model: AnyModelConfig) => addedKeys.has(model.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models]
  );

  const handleChange = useCallback(
    (model: AnyModelConfig | null) => {
      if (!model) {
        return;
      }
      dispatch(batchModelAdded({ model: model as MainModelConfig }));
    },
    [dispatch]
  );

  return (
    <Flex flexDir="column" gap={2} w="full">
      <InformationalPopover feature="paramModel">
        <ModelPicker
          pickerId="batch-model-picker"
          modelConfigs={modelConfigs}
          selectedModelConfig={undefined}
          onChange={handleChange}
          grouped
          allowEmpty
          placeholder="Add model..."
          getIsOptionDisabled={getIsDisabled}
        />
      </InformationalPopover>
      {models.length > 0 && (
        <Flex flexDir="column" gap={1} w="full">
          {models.map((m) => (
            <BatchModelCard key={m.id} id={m.id} modelId={m.model.key} />
          ))}
        </Flex>
      )}
      {models.length === 0 && (
        <Text fontSize="sm" color="base.500" textAlign="center" py={1}>
          No models selected
        </Text>
      )}
    </Flex>
  );
});
BatchModelList.displayName = 'BatchModelList';
