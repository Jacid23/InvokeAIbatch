import { Button, Flex, Text, Textarea } from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { BatchPromptCard } from 'features/batch/components/BatchPromptCard';
import { BatchStylePresetPicker } from 'features/batch/components/BatchStylePresetPicker';
import { batchPromptAdded, selectBatchPrompts } from 'features/batch/store/batchSlice';
import { atom } from 'nanostores';
import { type ChangeEvent, type KeyboardEvent, memo, useCallback, useState } from 'react';
import { PiCaretDownBold, PiCaretUpBold, PiImagesBold, PiPlusBold } from 'react-icons/pi';

const $isPickerOpen = atom<boolean>(false);

const PickerToggleButton = memo(() => {
  const isOpen = useStore($isPickerOpen);
  const handleToggle = useCallback(() => {
    $isPickerOpen.set(!isOpen);
  }, [isOpen]);

  return (
    <Button
      onClick={handleToggle}
      variant="ghost"
      size="sm"
      leftIcon={<PiImagesBold />}
      rightIcon={isOpen ? <PiCaretUpBold /> : <PiCaretDownBold />}
      w="full"
      justifyContent="flex-start"
    >
      Prompt Presets
    </Button>
  );
});
PickerToggleButton.displayName = 'PickerToggleButton';

const AddManualPromptButton = memo(() => {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState('');

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setText('');
  }, []);

  const handleAdd = useCallback(() => {
    if (text.trim()) {
      dispatch(batchPromptAdded({ text: text.trim(), isEnabled: true }));
      setText('');
    }
    setIsAdding(false);
  }, [dispatch, text]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleAdd();
      }
      if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleAdd, handleCancel]
  );

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  if (!isAdding) {
    return (
      <Button
        onClick={handleStartAdding}
        variant="ghost"
        size="sm"
        leftIcon={<PiPlusBold />}
        w="full"
        justifyContent="flex-start"
      >
        Add Custom Prompt
      </Button>
    );
  }

  return (
    <Flex flexDir="column" gap={1}>
      <Textarea
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter prompt... (Ctrl+Enter to add)"
        size="sm"
        rows={3}
        autoFocus
      />
      <Flex gap={1}>
        <Button size="xs" colorScheme="invokeYellow" onClick={handleAdd} isDisabled={!text.trim()}>
          Add
        </Button>
        <Button size="xs" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    </Flex>
  );
});
AddManualPromptButton.displayName = 'AddManualPromptButton';

export const BatchPromptList = memo(() => {
  const prompts = useAppSelector(selectBatchPrompts);
  const isPickerOpen = useStore($isPickerOpen);

  return (
    <Flex flexDir="column" gap={2}>
      <PickerToggleButton />
      {isPickerOpen && <BatchStylePresetPicker />}
      {prompts.length > 0 ? (
        <Flex flexDir="column" gap={1}>
          {prompts.map((prompt) => (
            <BatchPromptCard key={prompt.id} prompt={prompt} />
          ))}
        </Flex>
      ) : (
        <Text fontSize="sm" color="base.500" textAlign="center" py={2}>
          No prompts added yet
        </Text>
      )}
      <AddManualPromptButton />
    </Flex>
  );
});
BatchPromptList.displayName = 'BatchPromptList';
