# InvokeAIbatch+ Recovery Snapshot

This folder preserves the uncommitted work that existed in:

`T:\InvokeAIbuilds\InvokeAIbatch+`

Created from the current repo:

`T:\InvokeAIbuilds\InvokeAIbatch`

## What Is Preserved

- `plus-uncommitted.diff` - binary-safe git patch of modified/deleted tracked files from `InvokeAIbatch+`
- `files/` - copied contents of every existing modified or untracked file from `InvokeAIbatch+`
- `plus-git-status.txt` - original dirty status
- `plus-diff-name-status.txt` - changed tracked file list
- `plus-untracked-files.txt` - untracked file list
- `plus-git-log.txt` - recent commit context from `InvokeAIbatch+`
- `file-comparison.csv` - whether each dirty file existed and matched in current `InvokeAIbatch`

## Main Feature Area

The `+` folder appears to preserve experimental FLUX/Krea-related work:

- expanded FLUX samplers
- sigma schedule control
- FLUX sampler/scheduler defaults
- FP8 checkpoint compatibility
- `.weight` versus `.scale` Flux checkpoint compatibility
- model thumbnail auto-discovery

## Cleanup Note

Do not delete this recovery folder until the preserved changes have either been reviewed, ported, or intentionally discarded.
