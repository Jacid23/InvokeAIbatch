import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, Flex, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { SettingToggle } from 'features/modelManagerV2/subpanels/ModelPanel/SettingToggle';
import { isParameterFluxScheduler } from 'features/parameters/types/parameterSchemas';
import { memo, useCallback, useMemo } from 'react';
import type { UseControllerProps } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { MainModelDefaultSettingsFormData } from './MainModelDefaultSettings';

const FLUX_SAMPLER_OPTIONS: ComboboxOption[] = [
  { value: 'euler', label: 'Euler' },
  { value: 'heun', label: 'Heun (2nd order)' },
  { value: 'lcm', label: 'LCM' },
  { value: 'dpmpp_2m', label: 'DPM++ 2M' },
  { value: 'dpmpp_2m_sde', label: 'DPM++ 2M SDE' },
  { value: 'dpmpp_sde', label: 'DPM++ SDE' },
  { value: 'uni_pc', label: 'UniPC' },
  { value: 'deis', label: 'DEIS' },
  { value: 'sa_solver', label: 'SA-Solver PECE' },
];

type DefaultFluxSamplerType = MainModelDefaultSettingsFormData['fluxSampler'];

export const DefaultFluxSampler = memo((props: UseControllerProps<MainModelDefaultSettingsFormData>) => {
  const { field } = useController(props);

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!isParameterFluxScheduler(v?.value)) {
        return;
      }
      const updatedValue = {
        ...(field.value as DefaultFluxSamplerType),
        value: v.value,
      };
      field.onChange(updatedValue);
    },
    [field]
  );

  const value = useMemo(
    () => FLUX_SAMPLER_OPTIONS.find((o) => o.value === (field.value as DefaultFluxSamplerType).value),
    [field]
  );

  const isDisabled = useMemo(() => {
    return !(field.value as DefaultFluxSamplerType).isEnabled;
  }, [field.value]);

  return (
    <FormControl flexDir="column" gap={2} alignItems="flex-start">
      <Flex justifyContent="space-between" w="full">
        <InformationalPopover feature="paramScheduler">
          <FormLabel>Sampler</FormLabel>
        </InformationalPopover>
        <SettingToggle control={props.control} name="fluxSampler" />
      </Flex>
      <Combobox isDisabled={isDisabled} value={value} options={FLUX_SAMPLER_OPTIONS} onChange={onChange} />
    </FormControl>
  );
});

DefaultFluxSampler.displayName = 'DefaultFluxSampler';
