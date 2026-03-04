import { Button, Flex, IconButton, Text } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { batchPromptAdded, batchPromptRemoved, selectBatchPrompts } from 'features/batch/store/batchSlice';
import { useDeleteStylePreset } from 'features/stylePresets/components/DeleteStylePresetDialog';
import { StylePresetCreateButton } from 'features/stylePresets/components/StylePresetCreateButton';
import { StylePresetExportButton } from 'features/stylePresets/components/StylePresetExportButton';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { StylePresetImportButton } from 'features/stylePresets/components/StylePresetImportButton';
import StylePresetSearch from 'features/stylePresets/components/StylePresetSearch';
import { $stylePresetModalState } from 'features/stylePresets/store/stylePresetModal';
import { selectStylePresetSearchTerm } from 'features/stylePresets/store/stylePresetSlice';
import { memo, type MouseEvent, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCheckBold, PiCopyBold, PiPencilBold, PiPlusBold, PiTrashBold } from 'react-icons/pi';
import type { StylePresetRecordWithImage } from 'services/api/endpoints/stylePresets';
import { useListStylePresetsQuery } from 'services/api/endpoints/stylePresets';

type BatchPresetItemProps = {
  preset: StylePresetRecordWithImage;
  isInBatch: boolean;
  onAdd: (preset: StylePresetRecordWithImage) => void;
  onRemove: (preset: StylePresetRecordWithImage) => void;
};

const BatchPresetItem = memo(({ preset, isInBatch, onAdd, onRemove }: BatchPresetItemProps) => {
  const { t } = useTranslation();
  const deleteStylePreset = useDeleteStylePreset();

  const handleToggle = useCallback(() => {
    if (isInBatch) {
      onRemove(preset);
    } else {
      onAdd(preset);
    }
  }, [isInBatch, onAdd, onRemove, preset]);

  const handleEdit = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      $stylePresetModalState.set({
        prefilledFormData: {
          name: preset.name,
          positivePrompt: preset.preset_data.positive_prompt || '',
          negativePrompt: preset.preset_data.negative_prompt || '',
          imageUrl: preset.image,
          type: preset.type,
        },
        updatingStylePresetId: preset.id,
        isModalOpen: true,
      });
    },
    [preset]
  );

  const handleCopy = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      $stylePresetModalState.set({
        prefilledFormData: {
          name: `${preset.name} (${t('common.copy')})`,
          positivePrompt: preset.preset_data.positive_prompt || '',
          negativePrompt: preset.preset_data.negative_prompt || '',
          imageUrl: preset.image,
          type: 'user',
        },
        updatingStylePresetId: null,
        isModalOpen: true,
      });
    },
    [preset, t]
  );

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      deleteStylePreset(preset);
    },
    [deleteStylePreset, preset]
  );

  return (
    <Button
      as={Flex}
      role="button"
      gap={2}
      onClick={handleToggle}
      p={2}
      h="unset"
      variant={isInBatch ? 'solid' : 'ghost'}
      colorScheme={isInBatch ? 'invokeBlue' : undefined}
      w="full"
      alignItems="center"
      cursor="pointer"
    >
      <StylePresetImage presetImageUrl={preset.image} imageWidth={32} />
      <Flex flexDir="column" flexGrow={1} alignItems="flex-start" minW={0}>
        <Text fontSize="sm" noOfLines={1} fontWeight="semibold">
          {preset.name}
        </Text>
        {preset.preset_data.positive_prompt && (
          <Text fontSize="xs" noOfLines={1} color={isInBatch ? 'invokeBlue.100' : 'base.400'}>
            {preset.preset_data.positive_prompt}
          </Text>
        )}
      </Flex>
      <IconButton
        aria-label={isInBatch ? t('common.remove') : t('common.add')}
        variant="ghost"
        size="xs"
        icon={isInBatch ? <PiCheckBold /> : <PiPlusBold />}
        flexShrink={0}
        pointerEvents="none"
      />
      <IconButton
        size="xs"
        variant="link"
        aria-label={t('stylePresets.copyTemplate')}
        onClick={handleCopy}
        icon={<PiCopyBold />}
        flexShrink={0}
      />
      <IconButton
        size="xs"
        variant="link"
        aria-label={t('stylePresets.editTemplate')}
        onClick={handleEdit}
        icon={<PiPencilBold />}
        flexShrink={0}
      />
      <IconButton
        size="xs"
        variant="link"
        colorScheme="error"
        aria-label={t('stylePresets.deleteTemplate')}
        onClick={handleDelete}
        icon={<PiTrashBold />}
        flexShrink={0}
      />
    </Button>
  );
});
BatchPresetItem.displayName = 'BatchPresetItem';

export const BatchStylePresetPicker = memo(() => {
  const dispatch = useAppDispatch();
  const searchTerm = useAppSelector(selectStylePresetSearchTerm);
  const existingPrompts = useAppSelector(selectBatchPrompts);
  const { t } = useTranslation();

  // Only show user-created presets — filter out type === 'default'
  const { data: userPresets } = useListStylePresetsQuery(undefined, {
    selectFromResult: ({ data }) => {
      const filtered =
        data
          ?.filter((p) => p.type !== 'default' && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name)) ?? EMPTY_ARRAY;
      return { data: filtered };
    },
  });

  const selectedPresetIds = useMemo(
    () => new Set(existingPrompts.map((p) => p.presetId).filter(Boolean)),
    [existingPrompts]
  );

  const handleAdd = useCallback(
    (preset: StylePresetRecordWithImage) => {
      dispatch(
        batchPromptAdded({
          text: preset.preset_data.positive_prompt ?? '',
          isEnabled: true,
          presetId: preset.id,
          presetName: preset.name,
          presetImageUrl: preset.image,
        })
      );
    },
    [dispatch]
  );

  const handleRemove = useCallback(
    (preset: StylePresetRecordWithImage) => {
      const promptToRemove = existingPrompts.find((p) => p.presetId === preset.id);
      if (promptToRemove) {
        dispatch(batchPromptRemoved({ id: promptToRemove.id }));
      }
    },
    [dispatch, existingPrompts]
  );

  return (
    <Flex flexDir="column" gap={2} p={2} layerStyle="second" borderRadius="base">
      <Flex alignItems="center" gap={2} w="full" justifyContent="space-between">
        <StylePresetSearch />
        <Flex alignItems="center" gap={1} flexShrink={0}>
          <StylePresetCreateButton />
          <StylePresetImportButton />
          <StylePresetExportButton />
        </Flex>
      </Flex>
      <Flex flexDir="column" gap={1} maxH="300px" overflowY="auto">
        {(userPresets as StylePresetRecordWithImage[]).map((preset) => (
          <BatchPresetItem
            key={preset.id}
            preset={preset}
            isInBatch={selectedPresetIds.has(preset.id)}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        ))}
        {(userPresets as StylePresetRecordWithImage[]).length === 0 && (
          <Text fontSize="sm" color="base.500" textAlign="center" py={4}>
            {searchTerm ? t('stylePresets.noMatchingTemplates') : t('stylePresets.noTemplates')}
          </Text>
        )}
      </Flex>
    </Flex>
  );
});
BatchStylePresetPicker.displayName = 'BatchStylePresetPicker';
