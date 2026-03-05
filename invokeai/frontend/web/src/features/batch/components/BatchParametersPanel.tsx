import {
  Box,
  CompositeNumberInput,
  CompositeSlider,
  Expander,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  IconButton,
  Select,
  StandaloneAccordion,
  Switch,
  Text,
} from '@invoke-ai/ui-library';
import { NUMPY_RAND_MAX, NUMPY_RAND_MIN } from 'app/constants';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import { overlayScrollbarsParams, overlayScrollbarsStyles } from 'common/components/OverlayScrollbars/constants';
import { BatchLoraSlots } from 'features/batch/components/BatchLoraSlots';
import { BatchMathDisplay } from 'features/batch/components/BatchMathDisplay';
import { BatchModelList } from 'features/batch/components/BatchModelList';
import { BatchPromptList } from 'features/batch/components/BatchPromptList';
import { BatchSweepInput } from 'features/batch/components/BatchSweepInput';
import {
  batchGuidanceValuesChanged,
  batchHeightChanged,
  batchImagesPerComboChanged,
  batchSeedChanged,
  batchShouldRandomizeSeedChanged,
  batchShowThumbnailsToggled,
  batchStepsValuesChanged,
  batchWidthChanged,
  selectBatchShowThumbnails,
  selectBatchSlice,
} from 'features/batch/store/batchSlice';
import { selectFluxDypePreset } from 'features/controlLayers/store/paramsSlice';
import ParamFluxDypeExponent from 'features/parameters/components/Core/ParamFluxDypeExponent';
import ParamFluxDypePreset from 'features/parameters/components/Core/ParamFluxDypePreset';
import ParamFluxDypeScale from 'features/parameters/components/Core/ParamFluxDypeScale';
import ParamFluxScheduler from 'features/parameters/components/Core/ParamFluxScheduler';
import { AdvancedSettingsAccordion } from 'features/settingsAccordions/components/AdvancedSettingsAccordion/AdvancedSettingsAccordion';
import { useExpanderToggle } from 'features/settingsAccordions/hooks/useExpanderToggle';
import { useStandaloneAccordionToggle } from 'features/settingsAccordions/hooks/useStandaloneAccordionToggle';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { type ChangeEvent, type ChangeEventHandler, memo, useCallback, useMemo } from 'react';
import { PiArrowsLeftRight, PiCaretDownBold, PiImages } from 'react-icons/pi';
import { useMeasure } from 'react-use';

// ─── Constants ───────────────────────────────────────────────────────────────

const DIM_SLIDER_MIN = 64;
const DIM_SLIDER_MAX = 1536;
const DIM_INPUT_MAX = 4096;
const DIM_STEP = 64;
const DIM_FINE_STEP = 8;
const DIM_DEFAULT = 1024;

const SIZE_PRESETS = [
  { id: '21:9', width: 1536, height: 640 },
  { id: '16:9', width: 1344, height: 768 },
  { id: '3:2', width: 1216, height: 832 },
  { id: '4:3', width: 1152, height: 896 },
  { id: '1:1', width: 1024, height: 1024 },
  { id: '3:4', width: 896, height: 1152 },
  { id: '2:3', width: 832, height: 1216 },
  { id: '9:16', width: 768, height: 1344 },
  { id: '9:21', width: 640, height: 1536 },
] as const;

const STEPS_MARKS = [1, 50, 100];
const GUIDANCE_MARKS = [0, 3.5, 7];

// ─── Seed & Count Accordion ──────────────────────────────────────────────────

const BatchSeedAccordion = memo(() => {
  const dispatch = useAppDispatch();
  const batch = useAppSelector(selectBatchSlice);
  const { isOpen, onToggle } = useStandaloneAccordionToggle({ id: 'batch-seed', defaultIsOpen: true });

  const handleSeedChange = useCallback((v: number) => dispatch(batchSeedChanged(v)), [dispatch]);
  const handleRandomizeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => dispatch(batchShouldRandomizeSeedChanged(e.target.checked)),
    [dispatch]
  );
  const handleImagesPerComboChange = useCallback((v: number) => dispatch(batchImagesPerComboChanged(v)), [dispatch]);

  return (
    <StandaloneAccordion label="Seed & Count" isOpen={isOpen} onToggle={onToggle}>
      <Flex px={4} pt={4} pb={4} flexDir="column" gap={4}>
        <FormControl>
          <InformationalPopover feature="paramIterations">
            <FormLabel>Images per Combo</FormLabel>
          </InformationalPopover>
          <CompositeNumberInput
            step={1}
            fineStep={1}
            min={1}
            max={100}
            onChange={handleImagesPerComboChange}
            value={batch.imagesPerCombo}
            defaultValue={1}
          />
        </FormControl>
        <Flex gap={4} alignItems="flex-end">
          <FormControl flexGrow={1} isDisabled={batch.shouldRandomizeSeed}>
            <InformationalPopover feature="paramSeed">
              <FormLabel>Seed</FormLabel>
            </InformationalPopover>
            <CompositeNumberInput
              step={1}
              fineStep={1}
              min={NUMPY_RAND_MIN}
              max={NUMPY_RAND_MAX}
              onChange={handleSeedChange}
              value={batch.seed}
              defaultValue={0}
            />
          </FormControl>
          <FormControl w="min-content" mb={2}>
            <FormLabel m={0}>Random</FormLabel>
            <Switch isChecked={batch.shouldRandomizeSeed} onChange={handleRandomizeChange} />
          </FormControl>
        </Flex>
        <BatchMathDisplay />
      </Flex>
    </StandaloneAccordion>
  );
});
BatchSeedAccordion.displayName = 'BatchSeedAccordion';

// ─── Dimensions Preview ───────────────────────────────────────────────────────

const BatchDimensionsPreview = memo(() => {
  const batch = useAppSelector(selectBatchSlice);
  const [ref, dims] = useMeasure<HTMLDivElement>();

  const previewBoxSize = useMemo(() => {
    if (!dims || dims.width === 0) {
      return { width: 0, height: 0 };
    }
    const aspectRatioValue = batch.width / batch.height;
    let width: number;
    let height: number;
    if (batch.width > batch.height) {
      width = dims.width;
      height = width / aspectRatioValue;
    } else {
      height = dims.height;
      width = height * aspectRatioValue;
    }
    return { width, height };
  }, [dims, batch.width, batch.height]);

  return (
    <Flex w="full" h="full" alignItems="center" justifyContent="center" ref={ref}>
      <Flex
        position="relative"
        borderRadius="base"
        borderColor="base.600"
        borderWidth="3px"
        width={`${previewBoxSize.width}px`}
        height={`${previewBoxSize.height}px`}
        alignItems="center"
        justifyContent="center"
      >
        <Grid
          borderRadius="base"
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          gridTemplateColumns="1fr 1fr 1fr"
          gridTemplateRows="1fr 1fr 1fr"
          gap="1px"
          bg="base.700"
        >
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
          <GridItem bg="base.800" />
        </Grid>
      </Flex>
    </Flex>
  );
});
BatchDimensionsPreview.displayName = 'BatchDimensionsPreview';

// ─── Image Size Accordion ─────────────────────────────────────────────────────

const BatchImageAccordion = memo(() => {
  const dispatch = useAppDispatch();
  const batch = useAppSelector(selectBatchSlice);
  const { isOpen, onToggle } = useStandaloneAccordionToggle({ id: 'batch-image', defaultIsOpen: false });

  const handleWidthChange = useCallback((v: number) => dispatch(batchWidthChanged(v)), [dispatch]);
  const handleHeightChange = useCallback((v: number) => dispatch(batchHeightChanged(v)), [dispatch]);

  const handleSwap = useCallback(() => {
    dispatch(batchWidthChanged(batch.height));
    dispatch(batchHeightChanged(batch.width));
  }, [dispatch, batch.width, batch.height]);

  const handlePresetChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const preset = SIZE_PRESETS.find((p) => p.id === e.target.value);
      if (preset) {
        dispatch(batchWidthChanged(preset.width));
        dispatch(batchHeightChanged(preset.height));
      }
    },
    [dispatch]
  );

  const selectedPresetId = useMemo(() => {
    const match = SIZE_PRESETS.find((p) => p.width === batch.width && p.height === batch.height);
    return match?.id ?? 'custom';
  }, [batch.width, batch.height]);

  return (
    <StandaloneAccordion
      label="Image Size"
      badges={[`${batch.width}×${batch.height}`]}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <Flex px={4} pt={4} pb={4} gap={4} alignItems="center">
        {/* Left column: controls */}
        <Flex gap={4} flexDirection="column" width="full">
          <FormControl>
            <InformationalPopover feature="paramAspect">
              <FormLabel minW={10}>Preset</FormLabel>
            </InformationalPopover>
            <Flex gap={2}>
              <Select
                value={selectedPresetId}
                onChange={handlePresetChange}
                size="sm"
                cursor="pointer"
                iconSize="0.75rem"
                icon={<PiCaretDownBold />}
                flexGrow={1}
              >
                <option value="custom">Custom</option>
                {SIZE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} ({p.width}×{p.height})
                  </option>
                ))}
              </Select>
              <IconButton
                aria-label="Swap width and height"
                icon={<PiArrowsLeftRight />}
                onClick={handleSwap}
                size="sm"
                variant="ghost"
                flexShrink={0}
              />
            </Flex>
          </FormControl>
          <FormControl>
            <InformationalPopover feature="paramWidth">
              <FormLabel minW={10}>Width</FormLabel>
            </InformationalPopover>
            <CompositeSlider
              value={batch.width}
              onChange={handleWidthChange}
              defaultValue={DIM_DEFAULT}
              min={DIM_SLIDER_MIN}
              max={DIM_SLIDER_MAX}
              step={DIM_STEP}
              fineStep={DIM_FINE_STEP}
            />
            <CompositeNumberInput
              value={batch.width}
              onChange={handleWidthChange}
              defaultValue={DIM_DEFAULT}
              min={DIM_SLIDER_MIN}
              max={DIM_INPUT_MAX}
              step={DIM_STEP}
              fineStep={DIM_FINE_STEP}
            />
          </FormControl>
          <FormControl>
            <InformationalPopover feature="paramHeight">
              <FormLabel minW={10}>Height</FormLabel>
            </InformationalPopover>
            <CompositeSlider
              value={batch.height}
              onChange={handleHeightChange}
              defaultValue={DIM_DEFAULT}
              min={DIM_SLIDER_MIN}
              max={DIM_SLIDER_MAX}
              step={DIM_STEP}
              fineStep={DIM_FINE_STEP}
            />
            <CompositeNumberInput
              value={batch.height}
              onChange={handleHeightChange}
              defaultValue={DIM_DEFAULT}
              min={DIM_SLIDER_MIN}
              max={DIM_INPUT_MAX}
              step={DIM_STEP}
              fineStep={DIM_FINE_STEP}
            />
          </FormControl>
        </Flex>
        {/* Right column: aspect ratio preview grid */}
        <Flex w="108px" h="108px" flexShrink={0} flexGrow={0} alignItems="center" justifyContent="center">
          <BatchDimensionsPreview />
        </Flex>
      </Flex>
    </StandaloneAccordion>
  );
});
BatchImageAccordion.displayName = 'BatchImageAccordion';

// ─── Generation Accordion ─────────────────────────────────────────────────────

const BatchGenerationAccordion = memo(() => {
  const dispatch = useAppDispatch();
  const batch = useAppSelector(selectBatchSlice);
  const showThumbnails = useAppSelector(selectBatchShowThumbnails);
  const fluxDypePreset = useAppSelector(selectFluxDypePreset);
  const { isOpen, onToggle } = useStandaloneAccordionToggle({ id: 'batch-generation', defaultIsOpen: true });
  const { isOpen: isOpenAdvanced, onToggle: onToggleAdvanced } = useExpanderToggle({
    id: 'batch-generation-advanced',
    defaultIsOpen: false,
  });

  const handleStepsChange = useCallback((values: number[]) => dispatch(batchStepsValuesChanged(values)), [dispatch]);
  const handleGuidanceChange = useCallback(
    (values: number[]) => dispatch(batchGuidanceValuesChanged(values)),
    [dispatch]
  );
  const handleToggleThumbnails = useCallback(() => dispatch(batchShowThumbnailsToggled()), [dispatch]);

  return (
    <StandaloneAccordion label="Generation" isOpen={isOpen} onToggle={onToggle}>
      <Box px={4} pt={4}>
        <Flex flexDir="column" gap={4} pb={0}>
          <Flex alignItems="center" justifyContent="space-between">
            <Text fontSize="xs" color="base.400" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">
              Models &amp; LoRAs
            </Text>
            <IconButton
              aria-label={showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}
              icon={<PiImages />}
              onClick={handleToggleThumbnails}
              size="xs"
              variant="ghost"
              isActive={showThumbnails}
              title={showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}
            />
          </Flex>
          <BatchModelList />
          <BatchLoraSlots />
        </Flex>
        <Expander label="Advanced options" isOpen={isOpenAdvanced} onToggle={onToggleAdvanced}>
          <Flex gap={4} flexDir="column" pb={4}>
            <ParamFluxScheduler />
            <ParamFluxDypePreset />
            {fluxDypePreset === 'manual' && <ParamFluxDypeScale />}
            {fluxDypePreset === 'manual' && <ParamFluxDypeExponent />}
            <BatchSweepInput
              label="Steps"
              feature="paramSteps"
              values={batch.stepsValues}
              onChange={handleStepsChange}
              min={1}
              max={500}
              sliderMax={100}
              step={1}
              fineStep={1}
              defaultValue={30}
              marks={STEPS_MARKS}
            />
            <BatchSweepInput
              label="Guidance"
              feature="paramGuidance"
              values={batch.guidanceValues}
              onChange={handleGuidanceChange}
              min={0}
              max={20}
              sliderMax={7}
              step={0.5}
              fineStep={0.1}
              defaultValue={3.5}
              marks={GUIDANCE_MARKS}
            />
          </Flex>
        </Expander>
      </Box>
    </StandaloneAccordion>
  );
});
BatchGenerationAccordion.displayName = 'BatchGenerationAccordion';

// ─── Root Panel ───────────────────────────────────────────────────────────────

export const BatchParametersPanel = memo(() => {
  return (
    <Flex w="full" h="full" flexDir="column" gap={2}>
      <Flex w="full" h="full" position="relative">
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <OverlayScrollbarsComponent defer style={overlayScrollbarsStyles} options={overlayScrollbarsParams.options}>
            <Flex gap={2} flexDirection="column" h="full" w="full">
              <BatchPromptList />
              <BatchSeedAccordion />
              <BatchImageAccordion />
              <BatchGenerationAccordion />
              <AdvancedSettingsAccordion />
            </Flex>
          </OverlayScrollbarsComponent>
        </Box>
      </Flex>
    </Flex>
  );
});
BatchParametersPanel.displayName = 'BatchParametersPanel';
