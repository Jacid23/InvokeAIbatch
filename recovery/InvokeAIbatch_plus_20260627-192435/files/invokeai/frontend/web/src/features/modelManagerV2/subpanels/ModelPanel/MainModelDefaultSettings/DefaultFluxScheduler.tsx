import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, Flex, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { SettingToggle } from 'features/modelManagerV2/subpanels/ModelPanel/SettingToggle';
import { isParameterFluxSigmaSchedule } from 'features/parameters/types/parameterSchemas';
import { memo, useCallback, useMemo } from 'react';
import type { UseControllerProps } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { MainModelDefaultSettingsFormData } from './MainModelDefaultSettings';

const FLUX_SCHEDULER_OPTIONS: ComboboxOption[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'normal', label: 'Normal' },
  { value: 'ddim_uniform', label: 'DDIM Uniform' },
  { value: 'karras', label: 'Karras' },
  { value: 'beta', label: 'Beta' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'sgm_uniform', label: 'SGM Uniform' },
];

type DefaultFluxSchedulerType = MainModelDefaultSettingsFormData['fluxScheduler'];

export const DefaultFluxScheduler = memo((props: UseControllerProps<MainModelDefaultSettingsFormData>) => {
  const { field } = useController(props);

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!isParameterFluxSigmaSchedule(v?.value)) {
        return;
      }
      const updatedValue = {
        ...(field.value as DefaultFluxSchedulerType),
        value: v.value,
      };
      field.onChange(updatedValue);
    },
    [field]
  );

  const value = useMemo(
    () => FLUX_SCHEDULER_OPTIONS.find((o) => o.value === (field.value as DefaultFluxSchedulerType).value),
    [field]
  );

  const isDisabled = useMemo(() => {
    return !(field.value as DefaultFluxSchedulerType).isEnabled;
  }, [field.value]);

  return (
    <FormControl flexDir="column" gap={2} alignItems="flex-start">
      <Flex justifyContent="space-between" w="full">
        <FormLabel>Scheduler</FormLabel>
        <SettingToggle control={props.control} name="fluxScheduler" />
      </Flex>
      <Combobox isDisabled={isDisabled} value={value} options={FLUX_SCHEDULER_OPTIONS} onChange={onChange} />
    </FormControl>
  );
});

DefaultFluxScheduler.displayName = 'DefaultFluxScheduler';
