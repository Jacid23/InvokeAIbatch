import { Flex, Text } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectBatchTotalImages } from 'features/batch/store/batchSlice';
import { memo } from 'react';
import { PiFlaskBold } from 'react-icons/pi';

import { LaunchpadContainer } from './LaunchpadContainer';

export const BatchLaunchpadPanel = memo(() => {
  const totalImages = useAppSelector(selectBatchTotalImages);

  return (
    <LaunchpadContainer heading="Batch Tester">
      <Flex flexDir="column" alignItems="center" gap={6} py={4}>
        <Flex
          w={16}
          h={16}
          borderRadius="full"
          bg="base.800"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <PiFlaskBold size={32} color="var(--invoke-colors-invokeYellow-300)" />
        </Flex>
        {totalImages > 0 ? (
          <Flex flexDir="column" alignItems="center" gap={2}>
            <Text color="invokeYellow.300" fontWeight="semibold" fontSize="lg">
              {totalImages} images ready to generate
            </Text>
            <Text color="base.400" textAlign="center" fontSize="sm">
              Click <strong>Invoke Batch</strong> in the left panel to start. Images will appear in the gallery as they
              are generated.
            </Text>
          </Flex>
        ) : (
          <Flex flexDir="column" alignItems="center" gap={2}>
            <Text color="base.300" fontWeight="semibold" fontSize="lg">
              Configure your batch
            </Text>
            <Text color="base.500" textAlign="center" fontSize="sm">
              Add prompts, models, and LoRAs in the left panel. The Cartesian product of all enabled options will be
              generated.
            </Text>
          </Flex>
        )}
      </Flex>
    </LaunchpadContainer>
  );
});
BatchLaunchpadPanel.displayName = 'BatchLaunchpadPanel';
