import { Badge, Button, Flex, IconButton, Spacer, Text } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import {
  batchPromptAdded,
  batchPromptRemoved,
  selectBatchPrompts,
  selectBatchShowThumbnails,
} from 'features/batch/store/batchSlice';
import { useDeleteStylePreset } from 'features/stylePresets/components/DeleteStylePresetDialog';
import { StylePresetCreateButton } from 'features/stylePresets/components/StylePresetCreateButton';
import { StylePresetExportButton } from 'features/stylePresets/components/StylePresetExportButton';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { StylePresetImportButton } from 'features/stylePresets/components/StylePresetImportButton';
import StylePresetSearch from 'features/stylePresets/components/StylePresetSearch';
import { $stylePresetModalState } from 'features/stylePresets/store/stylePresetModal';
import { selectShowPromptPreviews, selectStylePresetSearchTerm } from 'features/stylePresets/store/stylePresetSlice';
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
  const showPromptPreviews = useAppSelector(selectShowPromptPreviews);
  const showThumbnails = useAppSelector(selectBatchShowThumbnails);

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
      gap={3}
      alignItems="flex-start"
      onClick={handleToggle}
      p={3}
      h="unset"
      variant="ghost"
      w="full"
      cursor="pointer"
    >
      {showThumbnails && <StylePresetImage presetImageUrl={preset.image} imageWidth={36} />}
      <Flex flexDir="column" flexGrow={1} minW={0} alignItems="flex-start" gap={1}>
        <Flex gap={1} alignItems="center" w="full" minW={0}>
          <Text
            fontSize="sm"
            noOfLines={1}
            fontWeight="semibold"
            color="base.100"
            flexGrow={1}
            minW={0}
            textAlign="left"
          >
            {preset.name}
          </Text>
          {isInBatch && (
            <Badge color="invokeBlue.400" borderColor="invokeBlue.700" borderWidth={1} bg="transparent" flexShrink={0}>
              {t('stylePresets.active')}
            </Badge>
          )}
          <Spacer />
          <IconButton
            aria-label={isInBatch ? t('common.remove') : t('common.add')}
            variant="link"
            size="sm"
            icon={isInBatch ? <PiCheckBold /> : <PiPlusBold />}
            flexShrink={0}
            pointerEvents="none"
          />
          <IconButton
            size="sm"
            variant="link"
            aria-label={t('stylePresets.copyTemplate')}
            onClick={handleCopy}
            icon={<PiCopyBold />}
            flexShrink={0}
          />
          <IconButton
            size="sm"
            variant="link"
            aria-label={t('stylePresets.editTemplate')}
            onClick={handleEdit}
            icon={<PiPencilBold />}
            flexShrink={0}
          />
          <IconButton
            size="sm"
            variant="link"
            colorScheme="error"
            aria-label={t('stylePresets.deleteTemplate')}
            onClick={handleDelete}
            icon={<PiTrashBold />}
            flexShrink={0}
          />
        </Flex>
        {showPromptPreviews && preset.preset_data.positive_prompt && (
          <Text fontSize="xs" color="base.400" whiteSpace="normal" textAlign="left" noOfLines={2}>
            {preset.preset_data.positive_prompt}
          </Text>
        )}
      </Flex>
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
    <Flex flexDir="column" gap={2} p={3} layerStyle="second" borderRadius="base">
      <Flex alignItems="center" gap={2} w="full" justifyContent="space-between">
        <Flex flexGrow={1} minW={0}>
          <StylePresetSearch />
        </Flex>
        <Flex alignItems="center" gap={1} flexShrink={0}>
          <StylePresetCreateButton />
          <StylePresetImportButton />
          <StylePresetExportButton />
        </Flex>
      </Flex>
      <Flex flexDir="column" gap={1} w="full" minW={0}>
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
