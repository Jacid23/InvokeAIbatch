import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store/store';
import type { SliceConfig } from 'app/store/types';
import { zModelIdentifierField } from 'features/nodes/types/common';
import type { LoRAModelConfig, MainModelConfig } from 'services/api/types';
import { v4 as uuidv4 } from 'uuid';
import z from 'zod';

// ─── Schemas ────────────────────────────────────────────

const zBatchPrompt = z.object({
  id: z.string(),
  text: z.string(),
  isEnabled: z.boolean(),
  presetId: z.string().optional(),
  presetName: z.string().optional(),
  presetImageUrl: z.string().nullish(),
});
export type BatchPrompt = z.infer<typeof zBatchPrompt>;

const zBatchModel = z.object({
  id: z.string(),
  model: zModelIdentifierField,
  isEnabled: z.boolean(),
});
export type BatchModel = z.infer<typeof zBatchModel>;

const zBatchLoRA = z.object({
  id: z.string(),
  model: zModelIdentifierField,
  weight: z.number(),
  isEnabled: z.boolean(),
});
export type BatchLoRA = z.infer<typeof zBatchLoRA>;

const zBatchLoRASlot = z.object({
  id: z.string(),
  weight: z.number(),
  loras: z.array(zBatchLoRA),
});
export type BatchLoRASlot = z.infer<typeof zBatchLoRASlot>;

// ─── Preset Schema ───────────────────────────────────────

const zBatchPreset = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  prompts: z.array(zBatchPrompt),
  models: z.array(zBatchModel),
  loraSlots: z.array(zBatchLoRASlot),
  stepsValues: z.array(z.number()),
  guidanceValues: z.array(z.number()),
  width: z.number(),
  height: z.number(),
  scheduler: z.string(),
  seed: z.number(),
  shouldRandomizeSeed: z.boolean(),
  imagesPerCombo: z.number(),
});
export type BatchPreset = z.infer<typeof zBatchPreset>;

const zBatchState = z.object({
  prompts: z.array(zBatchPrompt),
  models: z.array(zBatchModel),
  loraSlots: z.array(zBatchLoRASlot),
  stepsValues: z.array(z.number()),
  guidanceValues: z.array(z.number()),
  width: z.number(),
  height: z.number(),
  scheduler: z.string(),
  seed: z.number(),
  shouldRandomizeSeed: z.boolean(),
  imagesPerCombo: z.number(),
  showThumbnails: z.boolean(),
  presets: z.array(zBatchPreset).default([]),
});
type BatchState = z.infer<typeof zBatchState>;

// ─── Initial State ──────────────────────────────────────

const getInitialState = (): BatchState => ({
  prompts: [],
  models: [],
  loraSlots: [{ id: uuidv4(), weight: 0.75, loras: [] }],
  stepsValues: [20],
  guidanceValues: [3.5],
  width: 1024,
  height: 1024,
  scheduler: 'euler',
  seed: -1,
  shouldRandomizeSeed: true,
  imagesPerCombo: 1,
  showThumbnails: true,
  presets: [],
});

// ─── Slice ──────────────────────────────────────────────

const slice = createSlice({
  name: 'batch',
  initialState: getInitialState(),
  reducers: {
    // ── Prompts ────────────────────────────
    batchPromptAdded: {
      reducer: (state, action: PayloadAction<BatchPrompt>) => {
        state.prompts.push(action.payload);
      },
      prepare: (payload: Omit<BatchPrompt, 'id'>) => ({ payload: { ...payload, id: uuidv4() } }),
    },
    batchPromptRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.prompts = state.prompts.filter((p) => p.id !== action.payload.id);
    },
    batchPromptToggled: (state, action: PayloadAction<{ id: string; isEnabled: boolean }>) => {
      const prompt = state.prompts.find((p) => p.id === action.payload.id);
      if (prompt) {
        prompt.isEnabled = action.payload.isEnabled;
      }
    },
    batchPromptTextChanged: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const prompt = state.prompts.find((p) => p.id === action.payload.id);
      if (prompt) {
        prompt.text = action.payload.text;
      }
    },

    // ── Models ─────────────────────────────
    batchModelAdded: {
      reducer: (state, action: PayloadAction<BatchModel>) => {
        // Don't add duplicates
        if (state.models.some((m) => m.model.key === action.payload.model.key)) {
          return;
        }
        state.models.push(action.payload);
      },
      prepare: (payload: { model: MainModelConfig }) => ({
        payload: {
          id: uuidv4(),
          model: zModelIdentifierField.parse(payload.model),
          isEnabled: true,
        },
      }),
    },
    batchModelRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.models = state.models.filter((m) => m.id !== action.payload.id);
    },
    batchModelToggled: (state, action: PayloadAction<{ id: string; isEnabled: boolean }>) => {
      const model = state.models.find((m) => m.id === action.payload.id);
      if (model) {
        model.isEnabled = action.payload.isEnabled;
      }
    },

    // ── LoRA Slots ─────────────────────────
    batchLoRASlotAdded: {
      reducer: (state, action: PayloadAction<{ id: string }>) => {
        state.loraSlots.push({ id: action.payload.id, weight: 0.75, loras: [] });
      },
      prepare: () => ({ payload: { id: uuidv4() } }),
    },
    batchLoRASlotRemoved: (state, action: PayloadAction<{ slotId: string }>) => {
      if (state.loraSlots.length <= 1) {
        return;
      }
      state.loraSlots = state.loraSlots.filter((s) => s.id !== action.payload.slotId);
    },
    batchLoRASlotWeightChanged: (state, action: PayloadAction<{ slotId: string; weight: number }>) => {
      const slot = state.loraSlots.find((s) => s.id === action.payload.slotId);
      if (slot) {
        slot.weight = action.payload.weight;
      }
    },
    batchLoRAAddedToSlot: {
      reducer: (state, action: PayloadAction<{ slotId: string; lora: BatchLoRA }>) => {
        const slot = state.loraSlots.find((s) => s.id === action.payload.slotId);
        if (!slot) {
          return;
        }
        // Don't add duplicates within same slot
        if (slot.loras.some((l) => l.model.key === action.payload.lora.model.key)) {
          return;
        }
        slot.loras.push(action.payload.lora);
      },
      prepare: (payload: { slotId: string; model: LoRAModelConfig }) => ({
        payload: {
          slotId: payload.slotId,
          lora: {
            id: uuidv4(),
            model: zModelIdentifierField.parse(payload.model),
            weight: payload.model.default_settings?.weight ?? 0.75,
            isEnabled: true,
          },
        },
      }),
    },
    batchLoRARemovedFromSlot: (state, action: PayloadAction<{ slotId: string; loraId: string }>) => {
      const slot = state.loraSlots.find((s) => s.id === action.payload.slotId);
      if (slot) {
        slot.loras = slot.loras.filter((l) => l.id !== action.payload.loraId);
      }
    },
    batchLoRAToggled: (state, action: PayloadAction<{ slotId: string; loraId: string; isEnabled: boolean }>) => {
      const slot = state.loraSlots.find((s) => s.id === action.payload.slotId);
      if (slot) {
        const lora = slot.loras.find((l) => l.id === action.payload.loraId);
        if (lora) {
          lora.isEnabled = action.payload.isEnabled;
        }
      }
    },
    batchLoRAWeightChanged: (state, action: PayloadAction<{ slotId: string; loraId: string; weight: number }>) => {
      const slot = state.loraSlots.find((s) => s.id === action.payload.slotId);
      if (slot) {
        const lora = slot.loras.find((l) => l.id === action.payload.loraId);
        if (lora) {
          lora.weight = action.payload.weight;
        }
      }
    },

    // ── Settings ───────────────────────────
    batchStepsValuesChanged: (state, action: PayloadAction<number[]>) => {
      state.stepsValues = action.payload;
    },
    batchGuidanceValuesChanged: (state, action: PayloadAction<number[]>) => {
      state.guidanceValues = action.payload;
    },
    batchWidthChanged: (state, action: PayloadAction<number>) => {
      state.width = action.payload;
    },
    batchHeightChanged: (state, action: PayloadAction<number>) => {
      state.height = action.payload;
    },
    batchSchedulerChanged: (state, action: PayloadAction<string>) => {
      state.scheduler = action.payload;
    },
    batchSeedChanged: (state, action: PayloadAction<number>) => {
      state.seed = action.payload;
    },
    batchShouldRandomizeSeedChanged: (state, action: PayloadAction<boolean>) => {
      state.shouldRandomizeSeed = action.payload;
    },
    batchImagesPerComboChanged: (state, action: PayloadAction<number>) => {
      state.imagesPerCombo = action.payload;
    },
    batchShowThumbnailsToggled: (state) => {
      state.showThumbnails = !state.showThumbnails;
    },

    // ── Presets ────────────────────────────
    batchPresetSaved: {
      reducer: (state, action: PayloadAction<BatchPreset>) => {
        state.presets.push(action.payload);
      },
      prepare: (payload: Omit<BatchPreset, 'id' | 'createdAt'>) => ({
        payload: { ...payload, id: uuidv4(), createdAt: Date.now() },
      }),
    },
    batchPresetDeleted: (state, action: PayloadAction<{ id: string }>) => {
      state.presets = state.presets.filter((p) => p.id !== action.payload.id);
    },
    batchPresetLoaded: (state, action: PayloadAction<{ id: string }>) => {
      const preset = state.presets.find((p) => p.id === action.payload.id);
      if (!preset) {
        return;
      }
      state.prompts = preset.prompts;
      state.models = preset.models;
      state.loraSlots = preset.loraSlots;
      state.stepsValues = preset.stepsValues;
      state.guidanceValues = preset.guidanceValues;
      state.width = preset.width;
      state.height = preset.height;
      state.scheduler = preset.scheduler;
      state.seed = preset.seed;
      state.shouldRandomizeSeed = preset.shouldRandomizeSeed;
      state.imagesPerCombo = preset.imagesPerCombo;
    },
  },
});

export const {
  batchPromptAdded,
  batchPromptRemoved,
  batchPromptToggled,
  batchPromptTextChanged,
  batchModelAdded,
  batchModelRemoved,
  batchModelToggled,
  batchLoRASlotAdded,
  batchLoRASlotRemoved,
  batchLoRASlotWeightChanged,
  batchLoRAAddedToSlot,
  batchLoRARemovedFromSlot,
  batchLoRAToggled,
  batchLoRAWeightChanged,
  batchStepsValuesChanged,
  batchGuidanceValuesChanged,
  batchWidthChanged,
  batchHeightChanged,
  batchSchedulerChanged,
  batchSeedChanged,
  batchShouldRandomizeSeedChanged,
  batchImagesPerComboChanged,
  batchShowThumbnailsToggled,
  batchPresetSaved,
  batchPresetDeleted,
  batchPresetLoaded,
} = slice.actions;

// ─── Slice Config ───────────────────────────────────────

export const batchSliceConfig: SliceConfig<typeof slice> = {
  slice,
  schema: zBatchState,
  getInitialState,
  persistConfig: {
    migrate: (state) => zBatchState.parse(state),
  },
};

// ─── Selectors ──────────────────────────────────────────

export const selectBatchSlice = (state: RootState) => state.batch;

export const selectBatchPrompts = createSelector(selectBatchSlice, (batch) => batch.prompts);
export const selectBatchModels = createSelector(selectBatchSlice, (batch) => batch.models);
export const selectBatchLoRASlots = createSelector(selectBatchSlice, (batch) => batch.loraSlots);
export const selectBatchShowThumbnails = createSelector(selectBatchSlice, (batch) => batch.showThumbnails);
export const selectBatchPresets = createSelector(selectBatchSlice, (batch) => batch.presets);

export const selectEnabledBatchPrompts = createSelector(selectBatchPrompts, (prompts) =>
  prompts.filter((p) => p.isEnabled)
);
export const selectEnabledBatchModels = createSelector(selectBatchModels, (models) =>
  models.filter((m) => m.isEnabled)
);

export const selectBatchTotalImages = createSelector(selectBatchSlice, (batch) => {
  const enabledPrompts = batch.prompts.filter((p) => p.isEnabled).length;
  const enabledModels = batch.models.filter((m) => m.isEnabled).length;
  const slotCounts = batch.loraSlots.map((s) => s.loras.filter((l) => l.isEnabled).length).filter((c) => c > 0);
  const loraCombos = slotCounts.length > 0 ? slotCounts.reduce((a, b) => a * b, 1) : 0;
  const stepsCount = batch.stepsValues.length || 1;
  const guidanceCount = batch.guidanceValues.length || 1;
  const imagesPerCombo = batch.imagesPerCombo || 1;

  if (enabledPrompts === 0 || enabledModels === 0 || loraCombos === 0) {
    return 0;
  }

  return enabledPrompts * enabledModels * loraCombos * stepsCount * guidanceCount * imagesPerCombo;
});
