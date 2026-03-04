import { Card, CardBody, Flex, IconButton, Switch, Text, Textarea } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import {
  type BatchPrompt,
  batchPromptRemoved,
  batchPromptTextChanged,
  batchPromptToggled,
} from 'features/batch/store/batchSlice';
import StylePresetImage from 'features/stylePresets/components/StylePresetImage';
import { type ChangeEvent, memo, useCallback } from 'react';
import { PiTrashSimpleBold } from 'react-icons/pi';

type BatchPromptCardProps = {
  prompt: BatchPrompt;
};

export const BatchPromptCard = memo(({ prompt }: BatchPromptCardProps) => {
  const dispatch = useAppDispatch();

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

  return (
    <Card variant="lora" opacity={prompt.isEnabled ? 1 : 0.5}>
      <CardBody p={2}>
        <Flex gap={2} alignItems="flex-start">
          {prompt.presetImageUrl !== undefined && (
            <StylePresetImage presetImageUrl={prompt.presetImageUrl ?? null} imageWidth={40} />
          )}
          <Flex flexDir="column" flexGrow={1} gap={1} minW={0}>
            {prompt.presetName && (
              <Text fontSize="xs" color="base.400" noOfLines={1}>
                {prompt.presetName}
              </Text>
            )}
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
            />
          </Flex>
          <Flex flexDir="column" gap={1} alignItems="center">
            <Switch size="sm" isChecked={prompt.isEnabled} onChange={handleToggle} />
            <IconButton
              aria-label="Remove prompt"
              variant="ghost"
              size="xs"
              onClick={handleRemove}
              icon={<PiTrashSimpleBold />}
            />
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
});
BatchPromptCard.displayName = 'BatchPromptCard';
