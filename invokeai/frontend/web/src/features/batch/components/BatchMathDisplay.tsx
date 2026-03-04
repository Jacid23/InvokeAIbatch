import { Flex, Text } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectBatchSlice } from 'features/batch/store/batchSlice';
import { memo, useMemo } from 'react';

// ─── Sub-components ──────────────────────────────────────────────────────────

const MathFactor = memo(({ value, label }: { value: number; label: string }) => (
  <Text as="span" fontSize="xs" color="base.300">
    <Text as="span" fontWeight="bold" color="base.100">
      {value}
    </Text>{' '}
    {label}
  </Text>
));
MathFactor.displayName = 'MathFactor';

const MathOp = memo(({ children }: { children: string }) => (
  <Text as="span" fontSize="xs" color="base.500" px={0.5}>
    {children}
  </Text>
));
MathOp.displayName = 'MathOp';

// ─── Main Component ───────────────────────────────────────────────────────────

export const BatchMathDisplay = memo(() => {
  const batch = useAppSelector(selectBatchSlice);

  const math = useMemo(() => {
    const enabledPrompts = batch.prompts.filter((p) => p.isEnabled).length;
    const enabledModels = batch.models.filter((m) => m.isEnabled).length;
    const slotCounts = batch.loraSlots.map((s) => s.loras.filter((l) => l.isEnabled).length).filter((c) => c > 0);
    const loraCombos = slotCounts.length > 0 ? slotCounts.reduce((a, b) => a * b, 1) : 0;
    const stepsCount = batch.stepsValues.length || 1;
    const guidanceCount = batch.guidanceValues.length || 1;
    const imagesPerCombo = batch.imagesPerCombo || 1;

    const isReady = enabledPrompts > 0 && enabledModels > 0 && loraCombos > 0;
    const total = isReady
      ? enabledPrompts * enabledModels * loraCombos * stepsCount * guidanceCount * imagesPerCombo
      : 0;

    return { enabledPrompts, enabledModels, loraCombos, stepsCount, guidanceCount, imagesPerCombo, total };
  }, [batch]);

  if (math.total === 0) {
    return null;
  }

  return (
    <Flex flexDir="column" gap={1} px={1} pt={1}>
      <Text fontSize="xs" color="base.500" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">
        Math Breakdown
      </Text>
      <Flex flexWrap="wrap" alignItems="center" rowGap={1} columnGap={0.5}>
        <MathFactor value={math.enabledPrompts} label="prompts" />
        <MathOp>×</MathOp>
        <MathFactor value={math.enabledModels} label="models" />
        <MathOp>×</MathOp>
        <MathFactor value={math.loraCombos} label="LoRA combos" />
        <MathOp>×</MathOp>
        <MathFactor value={math.stepsCount} label="steps" />
        <MathOp>×</MathOp>
        <MathFactor value={math.guidanceCount} label="guidance" />
        <MathOp>×</MathOp>
        <MathFactor value={math.imagesPerCombo} label="per combo" />
        <MathOp>=</MathOp>
        <Text as="span" fontSize="xs" fontWeight="bold" color="invokeYellow.300">
          {math.total} images
        </Text>
      </Flex>
    </Flex>
  );
});
BatchMathDisplay.displayName = 'BatchMathDisplay';
