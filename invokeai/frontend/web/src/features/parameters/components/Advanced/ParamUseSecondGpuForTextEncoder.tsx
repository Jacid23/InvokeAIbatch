import { FormControl, FormLabel, Switch } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectCurrentUser } from 'features/auth/store/authSlice';
import { toast } from 'features/toast/toast';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useMemo } from 'react';
import {
  useGetAppDepsQuery,
  useGetRuntimeConfigQuery,
  useUpdateRuntimeConfigMutation,
} from 'services/api/endpoints/appInfo';

const getCudaDeviceCount = (appDeps: Record<string, string> | undefined): number => {
  const count = Number(appDeps?.['CUDA Devices'] ?? 0);
  return Number.isFinite(count) ? count : 0;
};

const isCudaDevice = (device: string | undefined, cudaDeviceCount: number): boolean => {
  if (!device || device === 'auto') {
    return cudaDeviceCount > 0;
  }
  return device === 'cuda' || device.startsWith('cuda:');
};

const ParamUseSecondGpuForTextEncoder = () => {
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: appDeps } = useGetAppDepsQuery();
  const { data: runtimeConfig } = useGetRuntimeConfigQuery();
  const [updateRuntimeConfig, { isLoading }] = useUpdateRuntimeConfigMutation();

  const cudaDeviceCount = useMemo(() => getCudaDeviceCount(appDeps), [appDeps]);
  const isAvailable = runtimeConfig
    ? cudaDeviceCount >= 2 && isCudaDevice(runtimeConfig.config.device, cudaDeviceCount)
    : false;
  const isChecked = Boolean(runtimeConfig?.config.use_second_gpu_for_text_encoder);
  const canEditRuntimeConfig = runtimeConfig ? !runtimeConfig.config.multiuser || currentUser?.is_admin : false;

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      try {
        await updateRuntimeConfig({ use_second_gpu_for_text_encoder: event.target.checked }).unwrap();
      } catch {
        toast({
          id: 'USE_SECOND_GPU_FOR_TEXT_ENCODER_SAVE_FAILED',
          title: 'Could not save second GPU encoder setting',
          status: 'error',
        });
      }
    },
    [updateRuntimeConfig]
  );

  return (
    <FormControl isDisabled={!runtimeConfig || !canEditRuntimeConfig || !isAvailable || isLoading}>
      <FormLabel m={0} flexGrow={1}>
        Use Second GPU for Text Encoder
      </FormLabel>
      <Switch size="sm" isChecked={isChecked} onChange={onChange} />
    </FormControl>
  );
};

export default memo(ParamUseSecondGpuForTextEncoder);
