import { FormControl, FormLabel, Switch } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectCurrentUser } from 'features/auth/store/authSlice';
import {
  selectAnimaQwen3EncoderModel,
  selectCLIPEmbedModel,
  selectCLIPGEmbedModel,
  selectCLIPLEmbedModel,
  selectIsAnima,
  selectIsFLUX,
  selectIsFlux2,
  selectIsQwenImage,
  selectIsSD3,
  selectIsZImage,
  selectKleinQwen3EncoderModel,
  selectQwenImageComponentSource,
  selectQwenImageQwenVLEncoderModel,
  selectT5EncoderModel,
  selectZImageQwen3EncoderModel,
  selectZImageQwen3SourceModel,
} from 'features/controlLayers/store/paramsSlice';
import type { ModelIdentifierField } from 'features/nodes/types/common';
import { toast } from 'features/toast/toast';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useMemo } from 'react';
import {
  useGetAppDepsQuery,
  useGetRuntimeConfigQuery,
  useSyncTextEncoderCacheMutation,
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
  const isFLUX = useAppSelector(selectIsFLUX);
  const isFlux2 = useAppSelector(selectIsFlux2);
  const isSD3 = useAppSelector(selectIsSD3);
  const isZImage = useAppSelector(selectIsZImage);
  const isQwenImage = useAppSelector(selectIsQwenImage);
  const isAnima = useAppSelector(selectIsAnima);
  const t5EncoderModel = useAppSelector(selectT5EncoderModel);
  const clipEmbedModel = useAppSelector(selectCLIPEmbedModel);
  const clipLEmbedModel = useAppSelector(selectCLIPLEmbedModel);
  const clipGEmbedModel = useAppSelector(selectCLIPGEmbedModel);
  const zImageQwen3EncoderModel = useAppSelector(selectZImageQwen3EncoderModel);
  const zImageQwen3SourceModel = useAppSelector(selectZImageQwen3SourceModel);
  const qwenImageQwenVLEncoderModel = useAppSelector(selectQwenImageQwenVLEncoderModel);
  const qwenImageComponentSource = useAppSelector(selectQwenImageComponentSource);
  const animaQwen3EncoderModel = useAppSelector(selectAnimaQwen3EncoderModel);
  const kleinQwen3EncoderModel = useAppSelector(selectKleinQwen3EncoderModel);
  const { data: appDeps } = useGetAppDepsQuery();
  const { data: runtimeConfig } = useGetRuntimeConfigQuery();
  const [updateRuntimeConfig, { isLoading }] = useUpdateRuntimeConfigMutation();
  const [syncTextEncoderCache, { isLoading: isSyncing }] = useSyncTextEncoderCacheMutation();

  const cudaDeviceCount = useMemo(() => getCudaDeviceCount(appDeps), [appDeps]);
  const isAvailable = runtimeConfig
    ? cudaDeviceCount >= 2 && isCudaDevice(runtimeConfig.config.device, cudaDeviceCount)
    : false;
  const isChecked = Boolean(runtimeConfig?.config.use_second_gpu_for_text_encoder);
  const canEditRuntimeConfig = runtimeConfig ? !runtimeConfig.config.multiuser || currentUser?.is_admin : false;
  const selectedTextEncoderModels = useMemo(() => {
    const models: (ModelIdentifierField | null | undefined)[] = [];

    if (isFLUX && !isFlux2) {
      models.push(t5EncoderModel, clipEmbedModel);
    } else if (isSD3) {
      models.push(t5EncoderModel, clipLEmbedModel, clipGEmbedModel);
    } else if (isZImage) {
      models.push(zImageQwen3EncoderModel ?? zImageQwen3SourceModel);
    } else if (isQwenImage) {
      models.push(qwenImageQwenVLEncoderModel ?? qwenImageComponentSource);
    } else if (isAnima) {
      models.push(animaQwen3EncoderModel);
    } else if (isFlux2) {
      models.push(kleinQwen3EncoderModel);
    }

    return models.filter((model): model is ModelIdentifierField => Boolean(model));
  }, [
    animaQwen3EncoderModel,
    clipEmbedModel,
    clipGEmbedModel,
    clipLEmbedModel,
    isAnima,
    isFLUX,
    isFlux2,
    isQwenImage,
    isSD3,
    isZImage,
    kleinQwen3EncoderModel,
    qwenImageComponentSource,
    qwenImageQwenVLEncoderModel,
    t5EncoderModel,
    zImageQwen3EncoderModel,
    zImageQwen3SourceModel,
  ]);

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const enabled = event.target.checked;
      try {
        await updateRuntimeConfig({ use_second_gpu_for_text_encoder: enabled }).unwrap();
        await syncTextEncoderCache({
          enabled,
          text_encoder_models: selectedTextEncoderModels,
        }).unwrap();
      } catch {
        toast({
          id: 'USE_SECOND_GPU_FOR_TEXT_ENCODER_SAVE_FAILED',
          title: 'Could not update second GPU encoder setting',
          status: 'error',
        });
      }
    },
    [selectedTextEncoderModels, syncTextEncoderCache, updateRuntimeConfig]
  );

  return (
    <FormControl isDisabled={!runtimeConfig || !canEditRuntimeConfig || !isAvailable || isLoading || isSyncing}>
      <FormLabel m={0} flexGrow={1}>
        Use Second GPU for Text Encoder
      </FormLabel>
      <Switch size="sm" isChecked={isChecked} onChange={onChange} />
    </FormControl>
  );
};

export default memo(ParamUseSecondGpuForTextEncoder);
