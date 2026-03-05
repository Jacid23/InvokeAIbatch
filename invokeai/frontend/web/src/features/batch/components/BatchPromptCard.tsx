import { Card, CardBody, Flex, IconButton, Switch, Text, Textarea } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import {
  type BatchPrompt,
  batchPromptRemoved,
  batchPromptTextChanged,
  batchPromptToggled,
  selectBatchShowThumbnails,
} from 'features/batch/store/batchSlice';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { selectShowPromptPreviews } from 'features/stylePresets/store/stylePresetSlice';
import { type ChangeEvent, memo, useCallback } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';

type BatchPromptCardProps = {
  prompt: BatchPrompt;
};

export const BatchPromptCard = memo(({ prompt }: BatchPromptCardProps) => {
  const dispatch = useAppDispatch();
  const showThumbnails = useAppSelector(selectBatchShowThumbnails);
  const showPromptPreviews = useAppSelector(selectShowPromptPreviews);

  const handleToggle = useCallback(() => {
    dispatch(batchPromptToggled({ id: prompt.id, isEnabled: !prompt.isEnabled }));
  }, [dispatch, prompt.id, prompt.isEnabled]);

  const handleRemove = useCallback(() => {
    dispatch(batchPromptRemoved({ id: prompt.id }));
  }, [dispatch, prompt.id]);

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      dispatch(batchPromptTextChanged({ id: prompt.id, text: e.target.value }));
    },
    [dispatch, prompt.id]
  );

  const isPreset = prompt.presetName !== undefined;

  return (
    <Card variant="lora" opacity={prompt.isEnabled ? 1 : 0.5}>
      <CardBody py={1} px={2}>
        {/* Outer row: thumbnail left, right column — description never spans under thumbnail */}
        <Flex gap={2} alignItems="flex-start" w="full">
          {showThumbnails && isPreset && (
            <StylePresetImage presetImageUrl={prompt.presetImageUrl ?? null} imageWidth={32} />
          )}
          <Flex flexDir="column" flexGrow={1} minW={0} gap={1}>
            {/* Name / textarea row — controls pinned right */}
            <Flex gap={2} alignItems="center">
              {isPreset ? (
                <Text
                  fontSize="sm"
                  noOfLines={1}
                  fontWeight="semibold"
                  color={prompt.isEnabled ? 'base.200' : 'base.500'}
                  flexGrow={1}
                  minW={0}
                >
                  {prompt.presetName}
                </Text>
              ) : (
                <Textarea
                  value={prompt.text}
                  onChange={handleTextChange}
                  size="xs"
                  resize="none"
                  rows={2}
                  isDisabled={!prompt.isEnabled}
                  color={prompt.isEnabled ? 'base.200' : 'base.500'}
                  bg="transparent"
                  border="none"
                  p={0}
                  _focus={{ outline: 'none', boxShadow: 'none' }}
                  flexGrow={1}
                />
              )}
              <Switch size="sm" isChecked={prompt.isEnabled} onChange={handleToggle} flexShrink={0} />
              <IconButton
                aria-label="Remove prompt"
                variant="ghost"
                size="xs"
                onClick={handleRemove}
                icon={<PiTrashSimpleBold />}
                flexShrink={0}
              />
            </Flex>
            {/* Description: preset only — completely hidden when eye is off */}
            {isPreset && showPromptPreviews && prompt.text && (
              <Text fontSize="xs" color={prompt.isEnabled ? 'base.400' : 'base.600'} whiteSpace="normal">
                {prompt.text}
              </Text>
            )}
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
});
BatchPromptCard.displayName = 'BatchPromptCard';
