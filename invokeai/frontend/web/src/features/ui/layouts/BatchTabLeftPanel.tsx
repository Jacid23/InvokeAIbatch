import { Box, Flex } from '@invoke-ai/ui-library';
import { BatchParametersPanel } from 'features/batch/components/BatchParametersPanel';
import { BatchQueueControls } from 'features/batch/components/BatchQueueControls';
import { memo } from 'react';

export const BatchTabLeftPanel = memo(() => {
  return (
    <Flex flexDir="column" w="full" h="full" gap={2}>
      <BatchQueueControls />
      <Box position="relative" w="full" h="full">
        <BatchParametersPanel />
      </Box>
    </Flex>
  );
});
BatchTabLeftPanel.displayName = 'BatchTabLeftPanel';
