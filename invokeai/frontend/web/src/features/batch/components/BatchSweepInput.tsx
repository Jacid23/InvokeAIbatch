import {
  Badge,
  CompositeNumberInput,
  CompositeSlider,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
} from '@invoke-ai/ui-library';
import type { Feature } from 'common/components/InformationalPopover/constants';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { memo, useCallback, useState } from 'react';
import { PiPlusBold, PiXBold } from 'react-icons/pi';

// ─── Chip sub-component (avoids inline arrow fns in JSX) ──────────────────────

type BatchSweepChipProps = {
  value: number;
  onRemove: (v: number) => void;
};

const BatchSweepChip = memo(({ value, onRemove }: BatchSweepChipProps) => {
  const handleClick = useCallback(() => onRemove(value), [onRemove, value]);
  return (
    <Badge
      display="flex"
      alignItems="center"
      gap={1}
      px={2}
      py={0.5}
      borderRadius="md"
      colorScheme="accent"
      variant="subtle"
      cursor="pointer"
      userSelect="none"
      onClick={handleClick}
      title={`Remove ${value}`}
    >
      {value}
      <PiXBold size={9} />
    </Badge>
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
          <IconButton
            aria-label={`Add ${label} value`}
            icon={<PiPlusBold />}
            onClick={handleAdd}
            size="sm"
            variant="ghost"
            flexShrink={0}
            isDisabled={values.includes(pendingValue)}
          />
        </FormControl>
        {values.length > 0 && (
          <Flex gap={1} flexWrap="wrap" ps={1}>
            {values.map((v) => (
              <BatchSweepChip key={v} value={v} onRemove={handleRemove} />
            ))}
          </Flex>
        )}
      </Flex>
    );
  }
);
BatchSweepInput.displayName = 'BatchSweepInput';
