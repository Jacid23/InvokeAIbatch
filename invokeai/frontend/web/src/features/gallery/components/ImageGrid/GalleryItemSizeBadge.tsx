import { Text } from '@invoke-ai/ui-library';
import { memo, useMemo } from 'react';
import { useDebouncedMetadata } from 'services/api/hooks/useDebouncedMetadata';
import type { ImageDTO } from 'services/api/types';

type Props = {
  imageDTO: ImageDTO;
};

export const GalleryItemSizeBadge = memo(({ imageDTO }: Props) => {
  const { metadata } = useDebouncedMetadata(imageDTO.image_name);

  const badgeText = useMemo(() => {
    if (!metadata) {
      return `${imageDTO.width}x${imageDTO.height}`;
    }

    const parts: string[] = [];

    // Show model name
    const model = metadata.model as { name?: string } | undefined;
    if (model?.name) {
      parts.push(model.name);
    }

    // Show LoRA names
    const loras = metadata.loras as Array<{ model?: { name?: string }; weight?: number }> | undefined;
    if (loras && loras.length > 0) {
      const loraNames = loras
        .map((l) => l.model?.name)
        .filter(Boolean)
        .join(', ');
      if (loraNames) {
        parts.push(loraNames);
      }
    }

    return parts.length > 0 ? parts.join(' + ') : `${imageDTO.width}x${imageDTO.height}`;
  }, [metadata, imageDTO.width, imageDTO.height]);

  return (
    <Text
      className="gallery-image-size-badge"
      position="absolute"
      background="base.900"
      color="base.50"
      fontSize="sm"
      fontWeight="semibold"
      bottom={1}
      left={1}
      opacity={0.7}
      px={2}
      lineHeight={1.25}
      borderTopEndRadius="base"
      pointerEvents="none"
      maxW="90%"
      overflow="hidden"
      textOverflow="ellipsis"
      whiteSpace="nowrap"
    >
      {badgeText}
    </Text>
  );
});

GalleryItemSizeBadge.displayName = 'GalleryItemSizeBadge';
