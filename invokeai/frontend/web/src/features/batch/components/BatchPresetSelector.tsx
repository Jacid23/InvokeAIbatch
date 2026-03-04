import { Button, Flex, IconButton, Input, Select } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import {
  batchPresetDeleted,
  batchPresetLoaded,
  batchPresetSaved,
  selectBatchPresets,
  selectBatchSlice,
} from 'features/batch/store/batchSlice';
import { type ChangeEvent, type KeyboardEvent, memo, useCallback, useState } from 'react';
import { PiCaretDownBold, PiFloppyDiskBold, PiTrashSimpleBold, PiXBold } from 'react-icons/pi';

export const BatchPresetSelector = memo(() => {
  const dispatch = useAppDispatch();
  const presets = useAppSelector(selectBatchPresets);
  const batch = useAppSelector(selectBatchSlice);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  const handleSelectPreset = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setSelectedPresetId(id);
      if (id) {
        dispatch(batchPresetLoaded({ id }));
      }
    },
    [dispatch]
  );

  const handleStartSave = useCallback(() => {
    setIsSaving(true);
    setSaveName('');
  }, []);

  const handleCancelSave = useCallback(() => {
    setIsSaving(false);
    setSaveName('');
  }, []);

  const handleSaveNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSaveName(e.target.value);
  }, []);

  const handleConfirmSave = useCallback(() => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      return;
    }
    dispatch(
      batchPresetSaved({
        name: trimmed,
        prompts: batch.prompts,
        models: batch.models,
        loraSlots: batch.loraSlots,
        stepsValues: batch.stepsValues,
        guidanceValues: batch.guidanceValues,
        width: batch.width,
        height: batch.height,
        scheduler: batch.scheduler,
        seed: batch.seed,
        shouldRandomizeSeed: batch.shouldRandomizeSeed,
        imagesPerCombo: batch.imagesPerCombo,
      })
    );
    setIsSaving(false);
    setSaveName('');
  }, [dispatch, saveName, batch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleConfirmSave();
      }
      if (e.key === 'Escape') {
        handleCancelSave();
      }
    },
    [handleConfirmSave, handleCancelSave]
  );

  const handleDelete = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    dispatch(batchPresetDeleted({ id: selectedPresetId }));
    setSelectedPresetId('');
  }, [dispatch, selectedPresetId]);

  if (isSaving) {
    return (
      <Flex gap={2} alignItems="center">
        <Input
          value={saveName}
          onChange={handleSaveNameChange}
          onKeyDown={handleKeyDown}
          placeholder="Preset name..."
          size="sm"
          flexGrow={1}
          autoFocus
        />
        <Button
          size="sm"
          colorScheme="invokeYellow"
          onClick={handleConfirmSave}
          isDisabled={!saveName.trim()}
          flexShrink={0}
        >
          Save
        </Button>
        <IconButton aria-label="Cancel save" icon={<PiXBold />} size="sm" variant="ghost" onClick={handleCancelSave} />
      </Flex>
    );
  }

  return (
    <Flex gap={2} alignItems="center">
      <Select
        value={selectedPresetId}
        onChange={handleSelectPreset}
        size="sm"
        flexGrow={1}
        cursor="pointer"
        iconSize="0.75rem"
        icon={<PiCaretDownBold />}
      >
        <option value="">Load preset...</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <IconButton
        aria-label="Save preset"
        icon={<PiFloppyDiskBold />}
        size="sm"
        variant="ghost"
        onClick={handleStartSave}
        title="Save current config as preset"
      />
      {selectedPresetId && (
        <IconButton
          aria-label="Delete preset"
          icon={<PiTrashSimpleBold />}
          size="sm"
          variant="ghost"
          colorScheme="error"
          onClick={handleDelete}
          title="Delete selected preset"
        />
      )}
    </Flex>
  );
});
BatchPresetSelector.displayName = 'BatchPresetSelector';
