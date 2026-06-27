import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, FormControl, FormLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectFluxSigmaSchedule, setFluxSigmaSchedule } from 'features/controlLayers/store/paramsSlice';
import { isParameterFluxSigmaSchedule } from 'features/parameters/types/parameterSchemas';
import { memo, useCallback, useMemo } from 'react';

const FLUX_SIGMA_SCHEDULE_OPTIONS: ComboboxOption[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'normal', label: 'Normal' },
  { value: 'ddim_uniform', label: 'DDIM Uniform' },
  { value: 'karras', label: 'Karras' },
  { value: 'beta', label: 'Beta' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'sgm_uniform', label: 'SGM Uniform' },
];

const ParamFluxSigmaSchedule = () => {
  const dispatch = useAppDispatch();
  const fluxSigmaSchedule = useAppSelector(selectFluxSigmaSchedule);

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!isParameterFluxSigmaSchedule(v?.value)) {
        return;
      }
      dispatch(setFluxSigmaSchedule(v.value));
    },
    [dispatch]
  );

  const value = useMemo(
    () => FLUX_SIGMA_SCHEDULE_OPTIONS.find((o) => o.value === fluxSigmaSchedule),
    [fluxSigmaSchedule]
  );

  return (
    <FormControl>
      <FormLabel>Scheduler</FormLabel>
      <Combobox value={value} options={FLUX_SIGMA_SCHEDULE_OPTIONS} onChange={onChange} />
    </FormControl>
  );
};

export default memo(ParamFluxSigmaSchedule);
