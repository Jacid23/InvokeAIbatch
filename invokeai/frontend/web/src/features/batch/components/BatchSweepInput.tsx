import { Button, CompositeNumberInput, CompositeSlider, Flex, FormControl, FormLabel } from '@invoke-ai/ui-library';
import type { Feature } from 'common/components/InformationalPopover/constants';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { memo, useCallback, useState } from 'react';
import { PiXBold } from 'react-icons/pi';

// ─── Chip sub-component ───────────────────────────────────────────────────────

type BatchSweepChipProps = {
  value: number;
  onRemove: (v: number) => void;
};

const BatchSweepChip = memo(({ value, onRemove }: BatchSweepChipProps) => {
  const handleClick = useCallback(() => onRemove(value), [onRemove, value]);
  return (
    <Flex
      as="button"
      type="button"
      onClick={handleClick}
      title={`Remove ${value}`}
      alignItems="center"
      justifyContent="center"
      gap={1}
      px={2}
      py={0.5}
      borderRadius="md"
      bg="base.750"
      color="base.300"
      fontSize="xs"
      fontWeight="normal"
      cursor="pointer"
      flexShrink={0}
      border="none"
      _hover={{ bg: 'base.700', color: 'base.200' }}
    >
      {value}
      <PiXBold size={9} />
    </Flex>
  );
});
BatchSweepChip.displayName = 'BatchSweepChip';

// ─── Main component ───────────────────────────────────────────────────────────

type BatchSweepInputProps = {
  label: string;
  feature?: Feature;
  values: number[];
  onChange: (values: number[]) => void;
  min?: number;
  max?: number;
  sliderMax?: number;
  step?: number;
  fineStep?: number;
  defaultValue?: number;
  marks?: number[];
};

export const BatchSweepInput = memo(
  ({
    label,
    feature,
    values,
    onChange,
    min = 0,
    max = 100,
    sliderMax,
    step = 1,
    fineStep,
    defaultValue,
    marks,
  }: BatchSweepInputProps) => {
    const [pendingValue, setPendingValue] = useState<number>(defaultValue ?? min);

    const handleAdd = useCallback(() => {
      if (values.includes(pendingValue)) {
        return;
      }
      onChange([...values, pendingValue].sort((a, b) => a - b));
    }, [pendingValue, values, onChange]);

    const handleRemove = useCallback(
      (v: number) => {
        const next = values.filter((x) => x !== v);
        if (next.length > 0) {
          onChange(next);
        }
      },
      [values, onChange]
    );

    return (
      <Flex flexDir="column" gap={1}>
        {/* Slider + number input row */}
        <FormControl>
          {feature !== undefined ? (
            <InformationalPopover feature={feature}>
              <FormLabel>{label}</FormLabel>
            </InformationalPopover>
          ) : (
            <FormLabel>{label}</FormLabel>
          )}
          <CompositeSlider
            value={pendingValue}
            onChange={setPendingValue}
            min={min}
            max={sliderMax ?? max}
            step={step}
            fineStep={fineStep ?? step}
            defaultValue={defaultValue ?? min}
            marks={marks}
          />
          <CompositeNumberInput
            value={pendingValue}
            onChange={setPendingValue}
            min={min}
            max={max}
            step={step}
            fineStep={fineStep ?? step}
            defaultValue={defaultValue ?? min}
            w={20}
            flexShrink={0}
          />
        </FormControl>
        {/* Grouped add + chips — thin border makes the sweep section visually distinct */}
        <Flex flexDir="column" gap={1} borderWidth="1px" borderColor="base.700" borderRadius="md" p={2}>
          <Button
            onClick={handleAdd}
            size="xs"
            variant="ghost"
            isDisabled={values.includes(pendingValue)}
            w="full"
            justifyContent="flex-start"
            color="base.400"
          >
            + Add to sweep
          </Button>
          {values.length > 0 && (
            <Flex gap={1} flexWrap="wrap">
              {values.map((v) => (
                <BatchSweepChip key={v} value={v} onRemove={handleRemove} />
              ))}
            </Flex>
          )}
        </Flex>
      </Flex>
    );
  }
);
BatchSweepInput.displayName = 'BatchSweepInput';
